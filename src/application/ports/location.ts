/**
 * Puerto de resolución de país por ubicación.
 *
 * Define el contrato que inyecta la composición (GPS + geocodificación) y los
 * códigos de error que la presentación traduce, sin acoplar la capa de
 * aplicación a los clientes concretos de `infrastructure/geo`.
 */

export type GeolocationErrorCode = 'denied' | 'unavailable' | 'timeout' | 'unsupported';
export type ReverseGeocodeErrorCode = 'network' | 'timeout' | 'http' | 'invalid-response';
export type LocationErrorCode = GeolocationErrorCode | ReverseGeocodeErrorCode | 'unknown';

const LOCATION_ERROR_CODES: ReadonlySet<string> = new Set<LocationErrorCode>([
  'denied',
  'unavailable',
  'timeout',
  'unsupported',
  'network',
  'http',
  'invalid-response',
]);

/** Extrae el código tipado de un error de ubicación; `'unknown'` si no lo tiene. */
export function locationErrorCode(error: unknown): LocationErrorCode {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error as { code?: unknown };
    if (typeof code === 'string' && LOCATION_ERROR_CODES.has(code)) {
      return code as LocationErrorCode;
    }
  }

  return 'unknown';
}

export interface ResolvedCountry {
  readonly country: string;
  readonly source: 'gps';
}

/** Resuelve el país a partir del GPS; la composición inyecta la implementación. */
export type ResolveCountryFn = () => Promise<ResolvedCountry>;
