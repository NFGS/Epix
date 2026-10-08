/**
 * Hook de notificaciones push reales (Web Push + VAPID).
 *
 * Máquina de estados:
 * - `unsupported`: sin soporte del navegador, sin clave VAPID o sin Supabase.
 * - `disabled`: disponible, sin suscripción activa en este navegador.
 * - `ready`: operación de activación/desactivación en curso.
 * - `subscribed`: suscripción activa en el navegador (guardada o no en nube).
 * - `error`: no se pudo determinar el estado o la última operación dejó al
 *   navegador en un estado que no se pudo confirmar.
 *
 * La UI solo muestra el interruptor cuando `isAvailable` es `true`, de modo
 * que sin `VITE_VAPID_PUBLIC_KEY` la sección queda exactamente como antes.
 *
 * Fixes de auditoría:
 * - P-03: un candado síncrono (`busyRef`) ignora toques repetidos durante
 *   `ready`; la UI además deshabilita el switch con `aria-busy`.
 * - P-06: `errorAction` distingue si falló activar, desactivar o consultar.
 * - P-07: tras un fallo se re-consulta `getSubscription()` y se refleja el
 *   estado real del navegador, en lugar de asumir.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  getPushSubscription,
  isPushSupported,
  PushError,
  serializePushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  type PushSubscriptionLike,
  type PushSubscriptionLookup,
  type SerializedPushSubscription,
} from '@/infrastructure/notifications/push';
import { resolveVapidPublicKey } from '@/shared/lib/env';
import { logger } from '@/shared/lib/logger';

export type PushNotificationStatus = 'unsupported' | 'disabled' | 'ready' | 'subscribed' | 'error';

/** P-06: operación cuyo error se está mostrando en la UI. */
export type PushErrorAction = 'enable' | 'disable' | 'query';

export interface PushClient {
  isSupported(): boolean;
  subscribe(vapidPublicKey: string): Promise<PushSubscriptionLike>;
  /** P-07: `none` / `subscription` / `error` (nunca confunde «no hay» con «fallo»). */
  getSubscription(): Promise<PushSubscriptionLookup>;
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
  /** P-06: distingue el mensaje de error por operación; `null` sin error. */
  errorAction: PushErrorAction | null;
  enable(): Promise<boolean>;
  disable(): Promise<boolean>;
  sendTest(): Promise<boolean>;
}

function statusFromLookup(lookup: PushSubscriptionLookup): PushNotificationStatus {
  switch (lookup.status) {
    case 'subscription':
      return 'subscribed';
    case 'none':
      return 'disabled';
    case 'error':
      return 'error';
  }
}

export function usePushNotifications(
  options: UsePushNotificationsOptions = {},
): PushNotificationsHandle {
  const client = options.client ?? defaultClient;
  const store = options.store ?? defaultStore;
  const vapidPublicKey = useMemo(
    () => (options.vapidPublicKey === undefined ? resolveVapidPublicKey() : options.vapidPublicKey),
    [options.vapidPublicKey],
  );

  const isAvailable = vapidPublicKey !== null && client.isSupported();
  const [internalStatus, setInternalStatus] = useState<PushNotificationStatus>(
    isAvailable ? 'disabled' : 'unsupported',
  );
  const [errorAction, setErrorAction] = useState<PushErrorAction | null>(null);
  // P-03: candado síncrono; el estado `ready` por sí solo no bloquea dos taps
  // disparados en el mismo tick (setState aún no re-renderizó).
  const busyRef = useRef(false);

  // Con push no disponible el estado visible es siempre `unsupported`: se
  // deriva en el render para no encadenar renders desde el effect.
  const status: PushNotificationStatus = isAvailable ? internalStatus : 'unsupported';

  useEffect(() => {
    if (!isAvailable) {
      return;
    }

    let active = true;

    const applyLookup = (lookup: PushSubscriptionLookup): void => {
      if (!active) {
        return;
      }

      if (lookup.status === 'error') {
        setErrorAction('query');
        setInternalStatus('error');
        return;
      }

      setInternalStatus(statusFromLookup(lookup));
    };

    void client
      .getSubscription()
      .then(applyLookup)
      .catch(() => {
        if (active) {
          setErrorAction('query');
          setInternalStatus('error');
        }
      });

    return () => {
      active = false;
    };
  }, [client, isAvailable]);

  /** P-07: re-consulta el navegador tras un fallo para reflejar el estado real. */
  const reflectRealStatus = useCallback(async (): Promise<PushNotificationStatus> => {
    try {
      return statusFromLookup(await client.getSubscription());
    } catch {
      return 'error';
    }
  }, [client]);

  const enable = useCallback(async (): Promise<boolean> => {
    if (!isAvailable || vapidPublicKey === null || busyRef.current) {
      return false;
    }

    busyRef.current = true;
    setErrorAction(null);
    setInternalStatus('ready');

    try {
      const subscription = await client.subscribe(vapidPublicKey);
      const payload = serializePushSubscription(subscription);

      if (payload === null) {
        throw new PushError('subscribe', 'La suscripción no incluyó endpoint ni claves push.');
      }

      await store.save(payload);
      setInternalStatus('subscribed');
      return true;
    } catch (cause) {
      logger.warn('Epix: no se pudo activar las notificaciones push.', cause);
      setErrorAction('enable');
      setInternalStatus(await reflectRealStatus());
      return false;
    } finally {
      busyRef.current = false;
    }
  }, [client, isAvailable, reflectRealStatus, store, vapidPublicKey]);

  const disable = useCallback(async (): Promise<boolean> => {
    if (!isAvailable || busyRef.current) {
      return false;
    }

    busyRef.current = true;
    setErrorAction(null);
    setInternalStatus('ready');

    try {
      const lookup = await client.getSubscription();
      const endpoint =
        lookup.status === 'subscription'
          ? (serializePushSubscription(lookup.subscription)?.endpoint ??
            lookup.subscription.endpoint)
          : null;

      await client.unsubscribe();

      if (endpoint !== null) {
        await store.remove(endpoint);
      }

      setInternalStatus('disabled');
      return true;
    } catch (cause) {
      logger.warn('Epix: no se pudo desactivar las notificaciones push.', cause);
      setErrorAction('disable');
      setInternalStatus(await reflectRealStatus());
      return false;
    } finally {
      busyRef.current = false;
    }
  }, [client, isAvailable, reflectRealStatus, store]);

  const sendTest = useCallback(async (): Promise<boolean> => {
    try {
      await store.sendTest();
      return true;
    } catch (cause) {
      logger.warn('Epix: no se pudo enviar la push de prueba.', cause);
      return false;
    }
  }, [store]);

  return { status, isAvailable, errorAction, enable, disable, sendTest };
}
