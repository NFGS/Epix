/**
 * E-02: política CORS de `epix-push`, extraída para poder probarla sin Deno.
 *
 * - Solo se permite `ALLOWED_ORIGIN` (lista separada por comas) más el origen
 *   de producción por defecto y `localhost:5173` para desarrollo.
 * - El cron es servidor→servidor y no usa CORS; `x-cron-secret` NO se anuncia
 *   en `Access-Control-Allow-Headers` (un navegador no puede prevalidarlo).
 * - Las peticiones sin `Origin` (cron) se aceptan sin cabeceras CORS.
 */

export const DEFAULT_ALLOWED_ORIGIN = 'https://epix-xi.vercel.app';

export const LOCAL_DEV_ORIGINS: readonly string[] = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

export const CORS_ALLOWED_HEADERS = 'authorization, content-type, apikey';
export const CORS_ALLOWED_METHODS = 'POST, OPTIONS';

export function resolveAllowedOrigins(configured: string | undefined): readonly string[] {
  const extra = (configured ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '');

  return [...new Set([...extra, DEFAULT_ALLOWED_ORIGIN, ...LOCAL_DEV_ORIGINS])];
}

export interface CorsDecision {
  allowed: boolean;
  headers: Record<string, string>;
}

export function corsDecision(
  origin: string | null | undefined,
  configured: string | undefined,
): CorsDecision {
  const normalized = origin?.trim() ?? '';

  if (normalized === '') {
    return { allowed: true, headers: {} };
  }

  if (!resolveAllowedOrigins(configured).includes(normalized)) {
    return { allowed: false, headers: {} };
  }

  return {
    allowed: true,
    headers: {
      'Access-Control-Allow-Origin': normalized,
      'Access-Control-Allow-Headers': CORS_ALLOWED_HEADERS,
      'Access-Control-Allow-Methods': CORS_ALLOWED_METHODS,
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    },
  };
}
