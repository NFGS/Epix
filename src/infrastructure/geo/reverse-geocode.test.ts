import { afterEach, describe, expect, it, vi } from 'vitest';

import { createReverseGeocoder, ReverseGeocodeError } from './reverse-geocode';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('createReverseGeocoder', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('parsea el país ISO alpha-2 en mayúsculas y llama a Nominatim con zoom 3', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      jsonResponse(200, { address: { country_code: 'co' } }),
    );
    const reverseGeocode = createReverseGeocoder({ fetchFn });

    await expect(reverseGeocode({ latitude: 4.711, longitude: -74.0721 })).resolves.toBe('CO');

    const [url] = fetchFn.mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.origin + parsed.pathname).toBe('https://nominatim.openstreetmap.org/reverse');
    expect(parsed.searchParams.get('format')).toBe('jsonv2');
    expect(parsed.searchParams.get('lat')).toBe('4.711');
    expect(parsed.searchParams.get('lon')).toBe('-74.0721');
    expect(parsed.searchParams.get('zoom')).toBe('3');
    expect(parsed.searchParams.get('accept-language')).toBe('es');
  });

  it('mantiene el código si Nominatim ya lo envía en mayúsculas', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      jsonResponse(200, { address: { country_code: 'ES' } }),
    );
    const reverseGeocode = createReverseGeocoder({ fetchFn });

    await expect(reverseGeocode({ latitude: 40.4, longitude: -3.7 })).resolves.toBe('ES');
  });

  it('lanza un error http tipado con el estado de la respuesta', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse(503, {}));
    const reverseGeocode = createReverseGeocoder({ fetchFn });

    const promise = reverseGeocode({ latitude: 1, longitude: 2 });

    await expect(promise).rejects.toBeInstanceOf(ReverseGeocodeError);
    await expect(promise).rejects.toMatchObject({ code: 'http', status: 503 });
  });

  it('lanza invalid-response cuando no hay country_code válido', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      jsonResponse(200, { address: { country: 'Colombia' } }),
    );
    const reverseGeocode = createReverseGeocoder({ fetchFn });

    await expect(reverseGeocode({ latitude: 1, longitude: 2 })).rejects.toMatchObject({
      code: 'invalid-response',
    });
  });

  it('convierte un fallo de red en error network', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => {
      throw new TypeError('Failed to fetch');
    });
    const reverseGeocode = createReverseGeocoder({ fetchFn });

    await expect(reverseGeocode({ latitude: 1, longitude: 2 })).rejects.toMatchObject({
      code: 'network',
    });
  });

  it('convierte el timeout de 8 s en error timeout', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn<typeof fetch>(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );
    const reverseGeocode = createReverseGeocoder({ fetchFn, timeoutMs: 50 });

    const promise = reverseGeocode({ latitude: 1, longitude: 2 });
    const assertion = expect(promise).rejects.toMatchObject({ code: 'timeout' });
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });
});
