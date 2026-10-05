/**
 * Adaptador de geolocalización del navegador.
 *
 * Promisifica `navigator.geolocation.getCurrentPosition` con parámetros
 * conservadores (sin alta precisión, caché de 5 min) y errores tipados que la
 * presentación puede traducir. La implementación se inyecta para poder probar
 * cada error sin tocar el navegador.
 */

import type { GeolocationErrorCode } from '@/application/ports/location';

/** Códigos de error de geolocalización (contrato del puerto de ubicación). */
export type GeoErrorCode = GeolocationErrorCode;

const GEO_ERROR_MESSAGES: Record<GeoErrorCode, string> = {
  denied: 'El usuario denegó el permiso de ubicación.',
  unavailable: 'La ubicación no está disponible en este dispositivo.',
  timeout: 'La ubicación tardó demasiado en responder.',
  unsupported: 'Este navegador no soporta geolocalización.',
};

export class GeoError extends Error {
  readonly code: GeoErrorCode;

  constructor(code: GeoErrorCode, message = GEO_ERROR_MESSAGES[code]) {
    super(message);
    this.name = 'GeoError';
    this.code = code;
  }
}

export interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}

/** Contrato mínimo de `navigator.geolocation` para inyectar dobles en pruebas. */
export interface GeolocationLike {
  getCurrentPosition(
    success: (position: { coords: { latitude: number; longitude: number } }) => void,
    error: (error: { code: number }) => void,
    options?: PositionOptions,
  ): void;
}

export interface GeolocationClient {
  getPosition(): Promise<Coordinates>;
}

export interface GeolocationClientOptions {
  /** `null` fuerza el escenario «sin soporte»; omitido usa `navigator.geolocation`. */
  geolocation?: GeolocationLike | null;
  timeoutMs?: number;
  maximumAgeMs?: number;
}

export const GEOLOCATION_TIMEOUT_MS = 10_000;
export const GEOLOCATION_MAXIMUM_AGE_MS = 5 * 60_000;

function defaultGeolocation(): GeolocationLike | null {
  if (typeof navigator === 'undefined') {
    return null;
  }

  const geolocation: unknown = navigator.geolocation;
  if (typeof geolocation !== 'object' || geolocation === null) {
    return null;
  }

  return geolocation as GeolocationLike;
}

function codeFromPositionError(code: number): GeoErrorCode {
  switch (code) {
    case 1:
      return 'denied';
    case 2:
      return 'unavailable';
    case 3:
      return 'timeout';
    default:
      return 'unavailable';
  }
}

export function createGeolocationClient(options: GeolocationClientOptions = {}): GeolocationClient {
  const geolocation =
    options.geolocation === undefined ? defaultGeolocation() : options.geolocation;
  const timeoutMs = options.timeoutMs ?? GEOLOCATION_TIMEOUT_MS;
  const maximumAgeMs = options.maximumAgeMs ?? GEOLOCATION_MAXIMUM_AGE_MS;

  return {
    getPosition(): Promise<Coordinates> {
      if (geolocation === null) {
        return Promise.reject(new GeoError('unsupported'));
      }

      return new Promise<Coordinates>((resolve, reject) => {
        geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            reject(new GeoError(codeFromPositionError(error.code)));
          },
          { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: maximumAgeMs },
        );
      });
    },
  };
}
