import { describe, expect, it, vi } from 'vitest';

import { GeoError } from '@/infrastructure/geo/geolocation';
import { ReverseGeocodeError } from '@/infrastructure/geo/reverse-geocode';

import { resolveCountry } from './resolve-country';

const POSITION = { latitude: 4.711, longitude: -74.0721 };

describe('resolveCountry', () => {
  it('resuelve el país con origen gps en el camino feliz', async () => {
    const getPosition = vi.fn(async () => POSITION);
    const reverseGeocode = vi.fn(async () => 'CO');

    await expect(resolveCountry({ getPosition, reverseGeocode })).resolves.toEqual({
      country: 'CO',
      source: 'gps',
    });
    expect(reverseGeocode).toHaveBeenCalledWith(POSITION);
  });

  it('propaga el error denied del GPS sin geocodificar', async () => {
    const getPosition = vi.fn(async () => {
      throw new GeoError('denied');
    });
    const reverseGeocode = vi.fn(async () => 'CO');

    await expect(resolveCountry({ getPosition, reverseGeocode })).rejects.toMatchObject({
      code: 'denied',
    });
    expect(reverseGeocode).not.toHaveBeenCalled();
  });

  it('propaga el error de red de la geocodificación inversa', async () => {
    const getPosition = vi.fn(async () => POSITION);
    const reverseGeocode = vi.fn(async () => {
      throw new ReverseGeocodeError('network');
    });

    await expect(resolveCountry({ getPosition, reverseGeocode })).rejects.toMatchObject({
      code: 'network',
    });
  });
});
