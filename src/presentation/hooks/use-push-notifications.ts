/**
 * Hook de notificaciones push reales (Web Push + VAPID).
 *
 * Máquina de estados:
 * - `unsupported`: sin soporte del navegador o sin clave VAPID.
 * - `disabled`: disponible, sin suscripción activa en este navegador.
 * - `ready`: operación de activación/desactivación en curso.
 * - `subscribed`: suscripción activa en el navegador (guardada o no en nube).
 * - `error`: no se pudo determinar el estado o la última operación dejó al
 *   navegador en un estado que no se pudo confirmar.
 *
 * La UI solo muestra el interruptor cuando `isAvailable` es `true`, de modo
 * que sin `VITE_VAPID_PUBLIC_KEY` la sección queda exactamente como antes.
 *
 * P-08: el acceso a Web Push y a Supabase pasa por `PushGateway` (inyectado en
 * `dependencies-context`); esta capa ya no importa `infrastructure`.
 *
 * Fixes de auditoría:
 * - P-03: un candado síncrono (`busyRef`) ignora toques repetidos durante
 *   `ready`; la UI además deshabilita el switch con `aria-busy`.
 * - P-06: `errorAction` distingue si falló activar, desactivar o consultar.
 * - P-07: tras un fallo se re-consulta `getState()` y se refleja el estado real
 *   del navegador, en lugar de asumir.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { PushState } from '@/application/ports/push-gateway';
import { resolveVapidPublicKey } from '@/shared/lib/env';
import { logger } from '@/shared/lib/logger';

import { useDependencies } from './dependencies-context';

export type PushNotificationStatus = 'unsupported' | 'disabled' | 'ready' | 'subscribed' | 'error';

/** P-06: operación cuyo error se está mostrando en la UI. */
export type PushErrorAction = 'enable' | 'disable' | 'query';

export interface UsePushNotificationsOptions {
  /** Clave pública VAPID; `null` fuerza no disponible. Omitida se lee del entorno. */
  vapidPublicKey?: string | null;
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

function statusFromState(state: PushState): PushNotificationStatus {
  switch (state.status) {
    case 'subscribed':
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
  const { push } = useDependencies();
  const vapidPublicKey = useMemo(
    () => (options.vapidPublicKey === undefined ? resolveVapidPublicKey() : options.vapidPublicKey),
    [options.vapidPublicKey],
  );

  const isAvailable = vapidPublicKey !== null && push.isSupported();
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

    const applyState = (state: PushState): void => {
      if (!active) {
        return;
      }

      if (state.status === 'error') {
        setErrorAction('query');
        setInternalStatus('error');
        return;
      }

      setInternalStatus(statusFromState(state));
    };

    void push
      .getState()
      .then(applyState)
      .catch(() => {
        if (active) {
          setErrorAction('query');
          setInternalStatus('error');
        }
      });

    return () => {
      active = false;
    };
  }, [push, isAvailable]);

  /** P-07: re-consulta el navegador tras un fallo para reflejar el estado real. */
  const reflectRealStatus = useCallback(async (): Promise<PushNotificationStatus> => {
    try {
      return statusFromState(await push.getState());
    } catch {
      return 'error';
    }
  }, [push]);

  const enable = useCallback(async (): Promise<boolean> => {
    if (!isAvailable || vapidPublicKey === null || busyRef.current) {
      return false;
    }

    busyRef.current = true;
    setErrorAction(null);
    setInternalStatus('ready');

    try {
      await push.subscribe(vapidPublicKey);
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
  }, [isAvailable, push, reflectRealStatus, vapidPublicKey]);

  const disable = useCallback(async (): Promise<boolean> => {
    if (!isAvailable || busyRef.current) {
      return false;
    }

    busyRef.current = true;
    setErrorAction(null);
    setInternalStatus('ready');

    try {
      await push.unsubscribe();
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
  }, [isAvailable, push, reflectRealStatus]);

  const sendTest = useCallback(async (): Promise<boolean> => {
    try {
      const { ok, error } = await push.sendTest();

      if (!ok) {
        logger.warn('Epix: no se pudo enviar la push de prueba.', error ?? '');
      }

      return ok;
    } catch (cause) {
      logger.warn('Epix: no se pudo enviar la push de prueba.', cause);
      return false;
    }
  }, [push]);

  return { status, isAvailable, errorAction, enable, disable, sendTest };
}
