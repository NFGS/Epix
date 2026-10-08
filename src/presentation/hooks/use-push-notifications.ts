/**
 * Hook de notificaciones push reales (Web Push + VAPID).
 *
 * Máquina de estados:
 * - `unsupported`: sin soporte del navegador, sin clave VAPID o sin Supabase.
 * - `disabled`: disponible, sin suscripción activa en este navegador.
 * - `ready`: operación de activación/desactivación en curso.
 * - `subscribed`: suscripción activa y guardada en Supabase.
 * - `error`: la última operación falló (la UI ofrece reintentar).
 *
 * La UI solo muestra el interruptor cuando `isAvailable` es `true`, de modo
 * que sin `VITE_VAPID_PUBLIC_KEY` la sección queda exactamente como antes.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  getPushSubscription,
  isPushSupported,
  PushError,
  serializePushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  type PushSubscriptionLike,
  type SerializedPushSubscription,
} from '@/infrastructure/notifications/push';
import { resolveVapidPublicKey } from '@/shared/lib/env';
import { logger } from '@/shared/lib/logger';

export type PushNotificationStatus =
  | 'unsupported'
  | 'disabled'
  | 'ready'
  | 'subscribed'
  | 'error';

export interface PushClient {
  isSupported(): boolean;
  subscribe(vapidPublicKey: string): Promise<PushSubscriptionLike>;
  getSubscription(): Promise<PushSubscriptionLike | null>;
  unsubscribe(): Promise<boolean>;
}

export interface PushStore {
  save(subscription: SerializedPushSubscription): Promise<void>;
  remove(endpoint: string): Promise<void>;
  sendTest(): Promise<void>;
}

const defaultClient: PushClient = {
  isSupported: () => isPushSupported(),
  subscribe: (vapidPublicKey) => subscribeToPush(vapidPublicKey),
  getSubscription: () => getPushSubscription(),
  unsubscribe: () => unsubscribeFromPush(),
};

// Carga perezosa: el adaptador de Supabase (y su chunk) solo se descarga al
// usar el push, nunca al renderizar el Perfil.
const defaultStore: PushStore = {
  save: async (subscription) => {
    const adapter = await import('@/infrastructure/supabase/push-subscriptions.adapter');
    await adapter.savePushSubscription(subscription);
  },
  remove: async (endpoint) => {
    const adapter = await import('@/infrastructure/supabase/push-subscriptions.adapter');
    await adapter.deletePushSubscription(endpoint);
  },
  sendTest: async () => {
    const adapter = await import('@/infrastructure/supabase/push-subscriptions.adapter');
    await adapter.sendTestPush();
  },
};

export interface UsePushNotificationsOptions {
  /** Clave pública VAPID; `null` fuerza no disponible. Omitida se lee del entorno. */
  vapidPublicKey?: string | null;
  client?: PushClient;
  store?: PushStore;
}

export interface PushNotificationsHandle {
  status: PushNotificationStatus;
  /** `true` cuando hay clave VAPID y soporte del navegador. */
  isAvailable: boolean;
  enable(): Promise<boolean>;
  disable(): Promise<boolean>;
  sendTest(): Promise<boolean>;
}

export function usePushNotifications(
  options: UsePushNotificationsOptions = {},
): PushNotificationsHandle {
  const client = options.client ?? defaultClient;
  const store = options.store ?? defaultStore;
  const vapidPublicKey = useMemo(
    () =>
      options.vapidPublicKey === undefined ? resolveVapidPublicKey() : options.vapidPublicKey,
    [options.vapidPublicKey],
  );

  const isAvailable = vapidPublicKey !== null && client.isSupported();
  const [internalStatus, setInternalStatus] = useState<PushNotificationStatus>(
    isAvailable ? 'disabled' : 'unsupported',
  );
  // Con push no disponible el estado visible es siempre `unsupported`: se
  // deriva en el render para no encadenar renders desde el effect.
  const status: PushNotificationStatus = isAvailable ? internalStatus : 'unsupported';

  useEffect(() => {
    if (!isAvailable) {
      return;
    }

    let active = true;

    void client
      .getSubscription()
      .then((subscription) => {
        if (active) {
          setInternalStatus(subscription === null ? 'disabled' : 'subscribed');
        }
      })
      .catch(() => {
        if (active) {
          setInternalStatus('error');
        }
      });

    return () => {
      active = false;
    };
  }, [client, isAvailable]);

  const enable = useCallback(async (): Promise<boolean> => {
    if (!isAvailable || vapidPublicKey === null) {
      return false;
    }

    setInternalStatus('ready');

    try {
      const subscription = await client.subscribe(vapidPublicKey);
      const payload = serializePushSubscription(subscription);

      if (payload === null) {
        throw new PushError(
          'subscribe',
          'La suscripción no incluyó endpoint ni claves push.',
        );
      }

      await store.save(payload);
      setInternalStatus('subscribed');
      return true;
    } catch (cause) {
      logger.warn('Epix: no se pudo activar las notificaciones push.', cause);
      setInternalStatus('error');
      return false;
    }
  }, [client, isAvailable, store, vapidPublicKey]);

  const disable = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) {
      return false;
    }

    setInternalStatus('ready');

    try {
      const subscription = await client.getSubscription();
      const endpoint =
        subscription === null
          ? null
          : (serializePushSubscription(subscription)?.endpoint ?? subscription.endpoint);

      await client.unsubscribe();

      if (endpoint !== null) {
        await store.remove(endpoint);
      }

      setInternalStatus('disabled');
      return true;
    } catch (cause) {
      logger.warn('Epix: no se pudo desactivar las notificaciones push.', cause);
      setInternalStatus('error');
      return false;
    }
  }, [client, isAvailable, store]);

  const sendTest = useCallback(async (): Promise<boolean> => {
    try {
      await store.sendTest();
      return true;
    } catch (cause) {
      logger.warn('Epix: no se pudo enviar la push de prueba.', cause);
      return false;
    }
  }, [store]);

  return { status, isAvailable, enable, disable, sendTest };
}
