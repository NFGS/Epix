import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../api/schedule';

const SCHEDULE_URL = 'https://epix.test/api/schedule';
const UPSTREAM_ERROR = { error: 'No se pudo obtener la agenda' };

function request(query: string): Request {
  return new Request(`${SCHEDULE_URL}${query}`);
}

describe('GET /api/schedule (proxy de agenda)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it.each([
    ['sin parámetros', ''],
    ['sin país', '?date=2026-10-05'],
    ['sin fecha', '?country=CO'],
    ['con país no alfabético', '?country=1C&date=2026-10-05'],
    ['con país de tres letras', '?country=COL&date=2026-10-05'],
    ['con fecha que no es ISO', '?country=CO&date=05-10-2026'],
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

  it('normaliza el país, consulta TVmaze y devuelve el JSON con caché de CDN', async () => {
    const payload = [{ id: 6001, name: 'Chapter One' }];
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(request('?country=co&date=2026-10-05'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.tvmaze.com/schedule?country=CO&date=2026-10-05');
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

  it('responde 502 sin caché cuando TVmaze devuelve un error', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('Service Unavailable', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(request('?country=CO&date=2026-10-05'));

    expect(response.status).toBe(502);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual(UPSTREAM_ERROR);
  });

  it('responde 502 cuando la red falla', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new TypeError('falló la red')));

    const response = await GET(request('?country=CO&date=2026-10-05'));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual(UPSTREAM_ERROR);
  });

  it('aborta la consulta a los 8 s y responde 502', async () => {
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

    const promise = GET(request('?country=CO&date=2026-10-05'));
    await vi.advanceTimersByTimeAsync(8_000);
    const response = await promise;

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual(UPSTREAM_ERROR);
  });
});
