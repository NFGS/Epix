import { describe, expect, it, vi } from 'vitest';

import {
  createGeolocationClient,
  GeoError,
  GEOLOCATION_MAXIMUM_AGE_MS,
  GEOLOCATION_TIMEOUT_MS,
  type GeolocationLike,
} from './geolocation';

const BOGOTA = { coords: { latitude: 4.711, longitude: -74.0721 } };

function geolocationStub(
  getCurrentPosition: GeolocationLike['getCurrentPosition'],
): GeolocationLike {
  return { getCurrentPosition };
}

describe('createGeolocationClient', () => {
  it('resuelve las coordenadas con timeout de 10 s, caché de 5 min y sin alta precisión', async () => {
    const getCurrentPosition = vi.fn<GeolocationLike['getCurrentPosition']>((success) => {
      success(BOGOTA);
    });
    const client = createGeolocationClient({
      geolocation: geolocationStub(getCurrentPosition),
    });

    await expect(client.getPosition()).resolves.toEqual({
      latitude: 4.711,
      longitude: -74.0721,
    });
    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
      enableHighAccuracy: false,
      timeout: GEOLOCATION_TIMEOUT_MS,
      maximumAge: GEOLOCATION_MAXIMUM_AGE_MS,
    });
  });

  it('traduce el código 1 (PERMISSION_DENIED) a denied', async () => {
    const getCurrentPosition = vi.fn<GeolocationLike['getCurrentPosition']>((_success, error) => {
      error({ code: 1 });
    });
    const client = createGeolocationClient({
      geolocation: geolocationStub(getCurrentPosition),
    });

    await expect(client.getPosition()).rejects.toBeInstanceOf(GeoError);
    await expect(client.getPosition()).rejects.toMatchObject({ code: 'denied' });
  });

  it('traduce el código 2 (POSITION_UNAVAILABLE) a unavailable', async () => {
    const getCurrentPosition = vi.fn<GeolocationLike['getCurrentPosition']>((_success, error) => {
      error({ code: 2 });
    });
    const client = createGeolocationClient({
      geolocation: geolocationStub(getCurrentPosition),
    });

    await expect(client.getPosition()).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('traduce el código 3 (TIMEOUT) a timeout', async () => {
    const getCurrentPosition = vi.fn<GeolocationLike['getCurrentPosition']>((_success, error) => {
      error({ code: 3 });
    });
    const client = createGeolocationClient({
      geolocation: geolocationStub(getCurrentPosition),
    });

    await expect(client.getPosition()).rejects.toMatchObject({ code: 'timeout' });
  });

  it('rechaza con unsupported cuando el entorno no expone geolocalización', async () => {
    const client = createGeolocationClient({ geolocation: null });

    await expect(client.getPosition()).rejects.toBeInstanceOf(GeoError);
    await expect(client.getPosition()).rejects.toMatchObject({ code: 'unsupported' });
  });
});
