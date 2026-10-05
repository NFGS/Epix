/**
 * Adaptador de notificaciones locales sobre la Notification API.
 *
 * `showLocalNotification` intenta primero el service worker registrado (así la
 * notificación sobrevive con la app en segundo plano y trae `data.url` para el
 * deep link) y cae al constructor global `Notification` en escritorio cuando no
 * hay SW. Toda dependencia es inyectable para poder probar sin navegador.
 */

import type {
  LocalNotificationOptions,
  NotificationPermissionState,
  NotificationsPort,
} from '@/domain/ports/notifications';

export type NotificationErrorCode = 'unsupported' | 'show';

export class NotificationError extends Error {
  readonly code: NotificationErrorCode;

  constructor(code: NotificationErrorCode, message: string) {
    super(message);
    this.name = 'NotificationError';
    this.code = code;
  }
}

export const NOTIFICATION_ICON = '/icons/pwa-192x192.png';
export const NOTIFICATION_BADGE = '/icons/pwa-192x192.png';

/** Contrato mínimo del registro del service worker para inyectar dobles. */
export interface ServiceWorkerRegistrationLike {
  showNotification(title: string, options?: NotificationOptions): Promise<void>;
}

/** Contrato mínimo del constructor `Notification` para inyectar dobles. */
export interface NotificationConstructorLike {
  new (title: string, options?: NotificationOptions): { close(): void };
}

export interface NotificationApiLike {
  readonly permission: NotificationPermission;
  requestPermission(): Promise<NotificationPermission>;
}

export interface NotificationClientOptions {
  /** `null` fuerza el escenario «sin soporte»; omitido usa `globalThis.Notification`. */
  api?: NotificationApiLike | null;
  /** `null` fuerza el escenario sin service worker; omitido usa `navigator.serviceWorker.ready`. */
  getRegistration?: (() => Promise<ServiceWorkerRegistrationLike | null>) | null;
  /** `null` desactiva el fallback; omitido usa `globalThis.Notification`. */
  NotificationCtor?: NotificationConstructorLike | null;
}

export type NotificationClient = NotificationsPort;

function defaultApi(): NotificationApiLike | null {
  if (typeof globalThis.Notification === 'undefined') {
    return null;
  }

  return globalThis.Notification;
}

function defaultCtor(): NotificationConstructorLike | null {
  if (typeof globalThis.Notification === 'undefined') {
    return null;
  }

  return globalThis.Notification;
}

async function defaultRegistration(): Promise<ServiceWorkerRegistrationLike | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

function toPermissionState(permission: NotificationPermission): NotificationPermissionState {
  return permission === 'granted' || permission === 'denied' ? permission : 'default';
}

export function createNotificationClient(
  options: NotificationClientOptions = {},
): NotificationClient {
  const api = options.api === undefined ? defaultApi() : options.api;
  const NotificationCtor =
    options.NotificationCtor === undefined ? defaultCtor() : options.NotificationCtor;
  const getRegistration =
    options.getRegistration === undefined ? defaultRegistration : options.getRegistration;

  return {
    getPermissionState(): NotificationPermissionState {
      if (api === null) {
        return 'unsupported';
      }

      return toPermissionState(api.permission);
    },

    async requestPermission(): Promise<NotificationPermissionState> {
      if (api === null) {
        return 'unsupported';
      }

      if (api.permission === 'granted' || api.permission === 'denied') {
        return toPermissionState(api.permission);
      }

      try {
        return toPermissionState(await api.requestPermission());
      } catch {
        return 'denied';
      }
    },

    async showLocalNotification(local: LocalNotificationOptions): Promise<void> {
      const notificationOptions: NotificationOptions = {
        body: local.body,
        icon: NOTIFICATION_ICON,
        badge: NOTIFICATION_BADGE,
        data: local.url === undefined ? undefined : { url: local.url },
      };

      if (local.tag !== undefined) {
        notificationOptions.tag = local.tag;
      }

      const registration = getRegistration === null ? null : await getRegistration();

      if (registration !== null) {
        try {
          await registration.showNotification(local.title, notificationOptions);
          return;
        } catch (error) {
          if (NotificationCtor === null) {
            throw new NotificationError(
              'show',
              error instanceof Error ? error.message : 'El service worker rechazó la notificación.',
            );
          }
        }
      }

      if (NotificationCtor === null) {
        throw new NotificationError(
          'unsupported',
          'Este navegador no soporta notificaciones locales.',
        );
      }

      new NotificationCtor(local.title, notificationOptions);
    },
  };
}
