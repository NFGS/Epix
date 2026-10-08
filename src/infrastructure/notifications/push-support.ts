/**
 * Detección síncrona de soporte Web Push.
 *
 * Vive en su propio módulo (sin dependencias) para que el gateway pueda
 * responder `isSupported()` sin cargar `push.ts` ni arrastrar nada al bundle
 * inicial; `push.ts` reutiliza la misma función.
 */

export function isWebPushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof globalThis.Notification !== 'undefined' &&
    typeof globalThis.PushManager !== 'undefined'
  );
}
