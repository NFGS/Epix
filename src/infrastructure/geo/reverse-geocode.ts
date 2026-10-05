/**
 * Geocodificación inversa con Nominatim (OpenStreetMap).
 *
 * Política de uso (https://operations.osmfoundation.org/policies/nominatim/):
 * máximo 1 petición por segundo, identificar la aplicación y cachear resultados.
 * Epix envía una sola petición por acción explícita del usuario; en el
 * navegador el `Referer`/`User-Agent` identifica la app automáticamente y la
 * agenda reutiliza el país guardado (no se repite la llamada).
 */

export type ReverseGeocodeErrorCode = 'network' | 'timeout' | 'http' | 'invalid-response';

const REVERSE_GEOCODE_MESSAGES: Record<ReverseGeocodeErrorCode, string> = {
  network: 'No se pudo conectar con Nominatim.',
  timeout: 'Nominatim tardó demasiado en responder.',
  http: 'Nominatim respondió con un estado inesperado.',
  'invalid-response': 'Nominatim no devolvió un país válido.',
};

export class ReverseGeocodeError extends Error {
  readonly code: ReverseGeocodeErrorCode;
  readonly status: number | null;

  constructor(
    code: ReverseGeocodeErrorCode,
    message = REVERSE_GEOCODE_MESSAGES[code],
    status: number | null = null,
  ) {
    super(message);
    this.name = 'ReverseGeocodeError';
    this.code = code;
    this.status = status;
  }
}

export interface ReverseGeocodePosition {
  readonly latitude: number;
  readonly longitude: number;
}

export type ReverseGeocoder = (position: ReverseGeocodePosition) => Promise<string>;

export interface ReverseGeocodeOptions {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const DEFAULT_TIMEOUT_MS = 8_000;
const COUNTRY_CODE_PATTERN = /^[a-z]{2}$/i;

export const REVERSE_GEOCODE_TIMEOUT_MS = DEFAULT_TIMEOUT_MS;

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: unknown }).name === 'AbortError'
  );
}

function countryCodeFromPayload(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null || !('address' in payload)) {
    return null;
  }

  const { address } = payload;
  if (typeof address !== 'object' || address === null || !('country_code' in address)) {
    return null;
  }

  const { country_code: countryCode } = address;
  if (typeof countryCode !== 'string' || !COUNTRY_CODE_PATTERN.test(countryCode)) {
    return null;
  }

  return countryCode.toUpperCase();
}

export function createReverseGeocoder(options: ReverseGeocodeOptions = {}): ReverseGeocoder {
  const { fetchFn = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  return async function reverseGeocode(position: ReverseGeocodePosition): Promise<string> {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(position.latitude),
      lon: String(position.longitude),
      zoom: '3',
      'accept-language': 'es',
    });
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    let response: Response;
    try {
      response = await fetchFn(`${NOMINATIM_REVERSE_URL}?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw new ReverseGeocodeError('timeout');
      }

      throw new ReverseGeocodeError('network');
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new ReverseGeocodeError(
        'http',
        `Nominatim respondió con estado ${response.status}.`,
        response.status,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ReverseGeocodeError('invalid-response');
    }

    const country = countryCodeFromPayload(payload);
    if (country === null) {
      throw new ReverseGeocodeError('invalid-response');
    }

    return country;
  };
}
