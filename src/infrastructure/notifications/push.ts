/**
 * Cliente Web Push (Push API + VAPID) sobre el service worker de Epix.
 *
 * - `subscribeToPush` pide permiso, espera el service worker activo y suscribe
 *   con `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`.
 * - `getPushSubscription` / `unsubscribeFromPush` gestionan la suscripción
 *   existente (la UI la usa para reflejar el estado real, no una preferencia).
 * - `serializePushSubscription` extrae `endpoint` + claves (`p256dh`, `auth`)
 *   para guardarlas en Supabase.
 *
 * Todas las dependencias del navegador son inyectables (`PushClientDeps`) para
 * poder probar los flujos sin Push API real.
 */

export type PushErrorCode =
  | 'unsupported'
  | 'invalid-key'
  | 'permission-denied'
  | 'subscribe'
  | 'unsubscribe';

export class PushError extends Error {
  readonly code: PushErrorCode;

  constructor(code: PushErrorCode, message: string) {
    super(message);
    this.name = 'PushError';
    this.code = code;
  }
}

/** Contrato mínimo de una `PushSubscription` real (inyectable en pruebas). */
export interface PushSubscriptionLike {
  endpoint: string;
  toJSON(): unknown;
  unsubscribe(): Promise<boolean>;
}

export interface PushSubscribeOptions {
  userVisibleOnly: true;
  applicationServerKey: Uint8Array<ArrayBuffer>;
}

/** Contrato mínimo de `PushManager` para inyectar dobles. */
export interface PushManagerLike {
  getSubscription(): Promise<PushSubscriptionLike | null>;
  subscribe(options: PushSubscribeOptions): Promise<PushSubscriptionLike>;
}

/** Contrato mínimo del registro del service worker con `pushManager`. */
export interface ServiceWorkerRegistrationLike {
  pushManager: PushManagerLike;
}

export type PushPermissionState = 'default' | 'denied' | 'granted' | 'unsupported';

export interface PushClientDeps {
  /** `true` fuerza soporte; omitido usa `navigator`/`PushManager`/`Notification`. */
  isSupported?: () => boolean;
  /** Omitido usa `navigator.serviceWorker.ready`; `null` simula «sin service worker». */
  getRegistration?: (() => Promise<ServiceWorkerRegistrationLike | null>) | null;
  /** Omitido usa `Notification.permission`. */
  getPermission?: () => PushPermissionState;
  /** Omitido usa `Notification.requestPermission()`. */
  requestPermission?: () => Promise<PushPermissionState>;
}

/** Suscripción lista para persistir en Supabase. */
export interface SerializedPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

function defaultIsSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof globalThis.Notification !== 'undefined' &&
    typeof globalThis.PushManager !== 'undefined'
  );
}

async function defaultGetRegistration(): Promise<ServiceWorkerRegistrationLike | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

function defaultGetPermission(): PushPermissionState {
  if (typeof globalThis.Notification === 'undefined') {
    return 'unsupported';
  }

  return globalThis.Notification.permission;
}

async function defaultRequestPermission(): Promise<PushPermissionState> {
  if (typeof globalThis.Notification === 'undefined') {
    return 'unsupported';
  }

  return globalThis.Notification.requestPermission();
}

function asErrorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

/** `true` cuando la plataforma puede recibir Web Push. */
export function isPushSupported(deps: PushClientDeps = {}): boolean {
  return (deps.isSupported ?? defaultIsSupported)();
}

/**
 * Convierte la clave pública VAPID (base64 URL-safe) al `Uint8Array` que exige
 * `applicationServerKey`. Lanza si el base64 no es válido.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }

  return output;
}

/**
 * Suscribe este navegador al push de Epix.
 *
 * Orden: soporte → clave VAPID válida → permiso de notificaciones → service
 * worker → `pushManager.subscribe`. Cualquier rechazo produce un `PushError`
 * con código tipado y traducible por la UI.
 */
export async function subscribeToPush(
  vapidPublicKey: string,
  deps: PushClientDeps = {},
): Promise<PushSubscriptionLike> {
  if (!isPushSupported(deps)) {
    throw new PushError('unsupported', 'Este navegador no soporta notificaciones push.');
  }

  const key = vapidPublicKey.trim();
  if (key === '') {
    throw new PushError('invalid-key', 'Falta la clave pública VAPID.');
  }

  const getPermission = deps.getPermission ?? defaultGetPermission;
  const requestPermission = deps.requestPermission ?? defaultRequestPermission;
  const permission = getPermission();

  if (permission !== 'granted') {
    if (permission === 'denied') {
      throw new PushError('permission-denied', 'El navegador bloqueó las notificaciones.');
    }

    const next = await requestPermission();
    if (next !== 'granted') {
      throw new PushError('permission-denied', 'El permiso de notificaciones no fue concedido.');
    }
  }

  const getRegistration =
    deps.getRegistration === undefined
      ? defaultGetRegistration
      : (deps.getRegistration ?? (async () => null));
  const registration = await getRegistration();

  if (registration === null) {
    throw new PushError('unsupported', 'No hay un service worker activo para recibir push.');
  }

  let applicationServerKey: Uint8Array<ArrayBuffer>;
  try {
    applicationServerKey = urlBase64ToUint8Array(key);
  } catch {
    throw new PushError('invalid-key', 'La clave pública VAPID no es válida.');
  }

  try {
    return await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
  } catch (cause) {
    throw new PushError(
      'subscribe',
      asErrorMessage(cause, 'El navegador rechazó la suscripción push.'),
    );
  }
}

/** Suscripción activa de este navegador, o `null` si no hay (o no hay soporte). */
export async function getPushSubscription(
  deps: PushClientDeps = {},
): Promise<PushSubscriptionLike | null> {
  if (!isPushSupported(deps)) {
    return null;
  }

  const getRegistration =
    deps.getRegistration === undefined
      ? defaultGetRegistration
      : (deps.getRegistration ?? (async () => null));
  const registration = await getRegistration();

  if (registration === null) {
    return null;
  }

  try {
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Cancela la suscripción en el navegador. Devuelve `false` si no había nada
 * que cancelar. El borrado en Supabase lo hace quien llama (adaptador).
 */
export async function unsubscribeFromPush(deps: PushClientDeps = {}): Promise<boolean> {
  const subscription = await getPushSubscription(deps);

  if (subscription === null) {
    return false;
  }

  try {
    return await subscription.unsubscribe();
  } catch (cause) {
    throw new PushError(
      'unsubscribe',
      asErrorMessage(cause, 'El navegador no pudo cancelar la suscripción push.'),
    );
  }
}

/**
 * Extrae `endpoint` + claves de una suscripción. Devuelve `null` cuando el
 * navegador no entrega los datos completos (no se persiste nada incompleto).
 */
export function serializePushSubscription(
  subscription: PushSubscriptionLike,
): SerializedPushSubscription | null {
  let json: unknown;

  try {
    json = subscription.toJSON();
  } catch {
    return null;
  }

  if (typeof json !== 'object' || json === null) {
    return null;
  }

  const { endpoint, keys } = json as { endpoint?: unknown; keys?: unknown };
  const p256dh =
    typeof keys === 'object' && keys !== null ? (keys as { p256dh?: unknown }).p256dh : undefined;
  const auth =
    typeof keys === 'object' && keys !== null ? (keys as { auth?: unknown }).auth : undefined;
  const resolvedEndpoint =
    typeof endpoint === 'string' && endpoint !== '' ? endpoint : subscription.endpoint;

  if (
    resolvedEndpoint === '' ||
    typeof p256dh !== 'string' ||
    p256dh === '' ||
    typeof auth !== 'string' ||
    auth === ''
  ) {
    return null;
  }

  return { endpoint: resolvedEndpoint, p256dh, auth };
}
