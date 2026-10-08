/**
 * E-04: allowlist de hosts de servicios push oficiales.
 *
 * Un `endpoint` es una URL-capacidad: si un atacante lograra insertar una fila
 * con un endpoint arbitrario, la Edge Function haría peticiones firmadas (con
 * las claves VAPID) hacia ese host (SSRF). Antes de enviar solo se aceptan
 * hosts de los servicios push de los navegadores objetivo:
 *
 * - `*.googleapis.com` (Chrome/Edge/Samsung usan FCM: `fcm.googleapis.com`);
 * - `*.push.apple.com` (Safari: `web.push.apple.com`);
 * - `*.mozilla.com` (Firefox: `updates.push.services.mozilla.com`);
 * - `*.windows.com` (Edge/Windows: `*.notify.windows.com`).
 *
 * El sufijo genérico `*.push.services` se omite: Mozilla publica en
 * `updates.push.services.mozilla.com`, ya cubierto por `*.mozilla.com`.
 *
 * El chequeo compara el `hostname` (no el `host`, que incluiría el puerto) y
 * exige `https:`; el punto inicial del sufijo evita engaños tipo
 * `fcm.googleapis.com.evil.example`.
 */

const TRUSTED_HOST_SUFFIXES: readonly string[] = [
  '.googleapis.com',
  '.push.apple.com',
  '.mozilla.com',
  '.windows.com',
];

export function isTrustedPushEndpoint(endpoint: string): boolean {
  let url: URL;

  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }

  if (url.protocol !== 'https:') {
    return false;
  }

  const host = url.hostname.toLowerCase();
  return TRUSTED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}
