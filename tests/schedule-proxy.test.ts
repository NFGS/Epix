import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../api/schedule';

const SCHEDULE_URL = 'https://epix.test/api/schedule';
const UPSTREAM_ERROR = { error: 'No se pudo obtener la agenda' };

function request(query: string): Request {
  return new Request(`${SCHEDULE_URL}${query}`);
}

/** Fecha ISO UTC desplazada `offsetDays` respecto a hoy (la ventana del proxy). */
function isoDate(offsetDays: number): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays))
    .toISOString()
    .slice(0, 10);
}

const TODAY = isoDate(0);

describe('GET /api/schedule (proxy de agenda)', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    consoleError.mockRestore();
  });

  it.each([
    ['sin parámetros', ''],
    ['sin país', `?date=${TODAY}`],
    ['sin fecha', '?country=CO'],
    ['con país no alfabético', `?country=1C&date=${TODAY}`],
    ['con país de tres letras', `?country=COL&date=${TODAY}`],
    ['con fecha que no es ISO', '?country=CO&date=05-10-2026'],
    ['con mes de calendario inexistente (E-07)', '?country=CO&date=2026-99-99'],
    ['con día de calendario inexistente (E-07)', '?country=CO&date=2026-02-30'],
  ])('responde 400 %s', async (_case, query) => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(request(query));

    expect(response.status).toBe(400);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      error: 'Parámetros inválidos: usa country=XX y date=YYYY-MM-DD.',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['fuera de la ventana por el futuro (E-06)', 20],
    ['fuera de la ventana por el pasado (E-06)', -20],
  ])('responde 400 %s', async (_case, offsetDays) => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(request(`?country=CO&date=${isoDate(offsetDays)}`));

    expect(response.status).toBe(400);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      error: 'Fecha fuera de la ventana permitida (±14 días).',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normaliza el país, consulta TVmaze y devuelve el JSON con caché de CDN', async () => {
    const payload = [{ id: 6001, name: 'Chapter One' }];
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(request(`?country=co&date=${TODAY}`));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`https://api.tvmaze.com/schedule?country=CO&date=${TODAY}`);
    expect(init?.headers).toEqual({
      Accept: 'application/json',
      'User-Agent': 'Epix/1.0 (+https://epix-xi.vercel.app)',
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Cache-Control')).toBe(
      'public, s-maxage=3600, stale-while-revalidate=86400',
    );
    await expect(response.json()).resolves.toEqual(payload);
  });

  it('responde 502 sin caché y registra el estado de TVmaze (P-12)', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('Service Unavailable', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(request(`?country=CO&date=${TODAY}`));

    expect(response.status).toBe(502);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual(UPSTREAM_ERROR);
    expect(consoleError).toHaveBeenCalledWith('api/schedule: TVmaze respondió con error.', {
      status: 503,
      country: 'CO',
      date: TODAY,
    });
  });

  it('responde 502 cuando la red falla y registra el nombre del error (P-12)', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new TypeError('falló la red')));

    const response = await GET(request(`?country=CO&date=${TODAY}`));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual(UPSTREAM_ERROR);
    expect(consoleError).toHaveBeenCalledWith(
      'api/schedule: fallo consultando TVmaze.',
      expect.objectContaining({ status: 0, country: 'CO', date: TODAY, name: 'TypeError' }),
    );
  });

  it('aborta la consulta a los 8 s, responde 502 y distingue AbortError (P-12)', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<typeof fetch>(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const promise = GET(request(`?country=CO&date=${TODAY}`));
    await vi.advanceTimersByTimeAsync(8_000);
    const response = await promise;

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual(UPSTREAM_ERROR);
    expect(consoleError).toHaveBeenCalledWith(
      'api/schedule: TVmaze superó el tiempo máximo de respuesta.',
      expect.objectContaining({ status: 0, country: 'CO', date: TODAY, name: 'AbortError' }),
    );
  });
});
