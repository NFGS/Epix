/**
 * Adaptador perezoso del puerto `PushGateway` (P-08).
 *
 * Compone los módulos reales (`push.ts`, `push-session.ts` y el adaptador de
 * Supabase) tras imports dinámicos: ni el cliente Web Push ni
 * `@supabase/supabase-js` entran al bundle inicial; se descargan al primer uso.
 * Mismo patrón que `createLazySupabaseSyncAdapter`.
 */

import { PushError, type PushGateway, type PushState } from '@/application/ports/push-gateway';
import { logger } from '@/shared/lib/logger';

import type {
  PushSubscriptionLike,
  PushSubscriptionLookup,
  SerializedPushSubscription,
} from './push';
import { isWebPushSupported } from './push-support';

/** Capacidades del cliente Web Push que el gateway necesita. */
export interface PushWebClient {
  subscribeToPush(vapidPublicKey: string): Promise<PushSubscriptionLike>;
  getPushSubscription(): Promise<PushSubscriptionLookup>;
  serializePushSubscription(subscription: PushSubscriptionLike): SerializedPushSubscription | null;
}

/** Operaciones de nube que el gateway necesita (adaptador de Supabase). */
export interface PushCloudStore {
  savePushSubscription(subscription: SerializedPushSubscription): Promise<void>;
  deletePushSubscription(endpoint: string): Promise<void>;
  sendTestPush(): Promise<void>;
}

/** Limpieza best-effort de la sesión push. */
export interface PushSessionControl {
  releasePushOnSignOut(): Promise<void>;
}

export interface PushGatewayOptions {
  /** Detección de soporte inyectable (pruebas). */
  supportsPush?: () => boolean;
  /** Carga del cliente Web Push inyectable (pruebas). */
  loadPush?: () => Promise<PushWebClient>;
  /** Carga del adaptador de Supabase inyectable (pruebas). */
  loadAdapter?: () => Promise<PushCloudStore>;
  /** Carga de la limpieza de sesión inyectable (pruebas). */
  loadSession?: () => Promise<PushSessionControl>;
}

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

function loadPushModule(): Promise<PushWebClient> {
  return import('./push');
}

function loadAdapterModule(): Promise<PushCloudStore> {
  return import('@/infrastructure/supabase/push-subscriptions.adapter');
}

function loadSessionModule(): Promise<PushSessionControl> {
  return import('./push-session');
}

export function createPushGateway(options: PushGatewayOptions = {}): PushGateway {
  const supportsPush = options.supportsPush ?? isWebPushSupported;
  const loadPush = options.loadPush ?? loadPushModule;
  const loadAdapter = options.loadAdapter ?? loadAdapterModule;
  const loadSession = options.loadSession ?? loadSessionModule;

  return {
    isSupported: () => supportsPush(),

    getState: async (): Promise<PushState> => {
      const { getPushSubscription, serializePushSubscription } = await loadPush();
      const lookup = await getPushSubscription();

      switch (lookup.status) {
        case 'none':
          return { status: 'none' };
        case 'error':
          return { status: 'error', code: lookup.error.code };
        case 'subscription':
          return {
            status: 'subscribed',
            endpoint:
              serializePushSubscription(lookup.subscription)?.endpoint ??
              lookup.subscription.endpoint,
          };
      }
    },

    subscribe: async (vapidPublicKey) => {
      const { subscribeToPush, serializePushSubscription } = await loadPush();
      const subscription = await subscribeToPush(vapidPublicKey);
      const payload = serializePushSubscription(subscription);

      if (payload === null) {
        throw new PushError('subscribe', 'La suscripción no incluyó endpoint ni claves push.');
      }

      try {
        const { savePushSubscription } = await loadAdapter();
        await savePushSubscription(payload);
      } catch (cause) {
        throw new PushError(
          'subscribe',
          messageOf(cause, 'No se pudo guardar la suscripción push en la nube.'),
        );
      }

      return { endpoint: payload.endpoint };
    },

    unsubscribe: async () => {
      const { getPushSubscription, serializePushSubscription } = await loadPush();
      const lookup = await getPushSubscription();

      if (lookup.status === 'error') {
        throw lookup.error;
      }

      if (lookup.status === 'none') {
        return;
      }

      const endpoint =
        serializePushSubscription(lookup.subscription)?.endpoint ?? lookup.subscription.endpoint;

      try {
        await lookup.subscription.unsubscribe();
      } catch (cause) {
        throw new PushError(
          'unsubscribe',
          messageOf(cause, 'El navegador no pudo cancelar la suscripción push.'),
        );
      }

      try {
        const { deletePushSubscription } = await loadAdapter();
        await deletePushSubscription(endpoint);
      } catch (cause) {
        throw new PushError(
          'unsubscribe',
          messageOf(cause, 'No se pudo borrar la suscripción push de la nube.'),
        );
      }
    },

    release: async () => {
      try {
        const { releasePushOnSignOut } = await loadSession();
        await releasePushOnSignOut();
      } catch (cause) {
        // Best-effort: un fallo (p. ej. el chunk no carga) no debe abortar el
        // cierre de sesión.
        logger.warn('Epix: no se pudo limpiar el push al cerrar sesión.', cause);
      }
    },

    sendTest: async () => {
      try {
        const { sendTestPush } = await loadAdapter();
        await sendTestPush();
        return { ok: true };
      } catch (cause) {
        return {
          ok: false,
          error: messageOf(cause, 'No se pudo enviar la push de prueba.'),
        };
      }
    },
  };
}
