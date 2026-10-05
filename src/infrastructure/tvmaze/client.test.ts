import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  createTvmazeClient,
  TvmazeHttpError,
  TvmazeNetworkError,
  TvmazeNotFoundError,
} from './client';

const schema = z.object({ ok: z.boolean() });

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('createTvmazeClient', () => {
  it('valida la respuesta con Zod y envía Accept: application/json', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }));
    const client = createTvmazeClient({ fetchFn, sleepFn: vi.fn(async () => {}) });

    await expect(client.get('/shows/1', schema)).resolves.toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.tvmaze.com/shows/1',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  it('reintenta con backoff cuando TVmaze responde 429 y luego logra el éxito', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(429, {}))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const sleepFn = vi.fn<(ms: number) => Promise<void>>(async () => {});
    const client = createTvmazeClient({ fetchFn, sleepFn });

    await expect(client.get('/search/shows?q=girls', schema)).resolves.toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(sleepFn).toHaveBeenCalledTimes(1);
    const [delay] = sleepFn.mock.calls[0];
    expect(delay).toBeGreaterThanOrEqual(800);
    expect(delay).toBeLessThan(1000);
  });

  it('tipa el 404 como TvmazeNotFoundError sin reintentar', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse(404, {}));
    const client = createTvmazeClient({ fetchFn, sleepFn: vi.fn(async () => {}) });

    await expect(client.get('/shows/999', schema)).rejects.toBeInstanceOf(TvmazeNotFoundError);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('agota los 3 intentos ante 5xx y lanza TvmazeHttpError con el estado', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse(503, {}));
    const sleepFn = vi.fn(async () => {});
    const client = createTvmazeClient({ fetchFn, sleepFn });

    const promise = client.get('/shows/1', schema);

    await expect(promise).rejects.toBeInstanceOf(TvmazeHttpError);
    await expect(promise).rejects.toMatchObject({ status: 503 });
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(sleepFn).toHaveBeenCalledTimes(2);
  });

  it('rechaza payloads que no cumplen el contrato', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: 'no' }));
    const client = createTvmazeClient({ fetchFn, sleepFn: vi.fn(async () => {}) });

    await expect(client.get('/shows/1', schema)).rejects.toBeInstanceOf(TvmazeHttpError);
  });

  it('convierte el timeout en TvmazeNetworkError', async () => {
    vi.useFakeTimers();
    try {
      const fetchFn = vi.fn<typeof fetch>(
        (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }),
      );
      const client = createTvmazeClient({
        fetchFn,
        timeoutMs: 50,
        sleepFn: vi.fn(async () => {}),
      });

      const promise = client.get('/shows/1', schema);
      const assertion = expect(promise).rejects.toBeInstanceOf(TvmazeNetworkError);
      await vi.advanceTimersByTimeAsync(100);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});

afterEach(() => {
  vi.useRealTimers();
});
