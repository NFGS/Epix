/**
 * Puerto de notificaciones push (P-08).
 *
 * La presentación depende de este contrato y el composition root
 * (`app/providers.tsx`) inyecta el adaptador de infraestructura
 * (`infrastructure/notifications/push-gateway`), de modo que la capa de
 * presentación no conoce `push.ts`, `push-session.ts` ni Supabase.
 *
 * Los errores de operación viajan como `PushError` con código tipado. `release`
 * es best-effort y NUNCA lanza: el cierre de sesión no debe fallar por push.
 */

/** Códigos de error tipados del flujo push (los comparten cliente y adaptador). */
export type PushErrorCode =
  'unsupported' | 'invalid-key' | 'permission-denied' | 'subscribe' | 'unsubscribe' | 'query';

export class PushError extends Error {
  readonly code: PushErrorCode;

  constructor(code: PushErrorCode, message: string) {
    super(message);
    this.name = 'PushError';
    this.code = code;
  }
}

/** Estado real del push en este navegador (nunca confunde «no hay» con «fallo»). */
export type PushState =
  | { status: 'none' }
  | { status: 'subscribed'; endpoint: string }
  | { status: 'error'; code: PushErrorCode };

/** Contrato de Web Push que consume la presentación. */
export interface PushGateway {
  /** Soporte del navegador; síncrono porque decide si la UI se muestra. */
  isSupported(): boolean;
  /** Estado real de la suscripción de este navegador. */
  getState(): Promise<PushState>;
  /** Suscribe el navegador y guarda/reclama la fila en la nube. */
  subscribe(vapidPublicKey: string): Promise<{ endpoint: string }>;
  /** Cancela el push del navegador y borra la fila de la nube. */
  unsubscribe(): Promise<void>;
  /** Limpieza best-effort al cerrar sesión; nunca lanza. */
  release(): Promise<void>;
  /** Push de prueba vía Edge Function; el error viaja en el resultado. */
  sendTest(): Promise<{ ok: boolean; error?: string }>;
}
