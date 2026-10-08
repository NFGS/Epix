/**
 * E-05: limpieza de push al cerrar sesión en un dispositivo compartido.
 *
 * Antes de borrar los datos locales se elimina la fila de `push_subscriptions`
 * y se cancela la suscripción del navegador (ambas best-effort): si quedaran
 * vivas, la Edge Function seguiría enviando avisos de la cuenta anterior a
 * este navegador, y la siguiente cuenta que inicie sesión podría reclamar el
 * mismo endpoint con avisos mezclados.
 *
 * El borrado remoto se hace ANTES de `auth.signOut()` (RLS exige la sesión del
 * usuario que posee la fila). Nunca lanza: el cierre de sesión no debe fallar
 * porque un push no se pudo limpiar; solo se registra el aviso.
 *
 * Deuda aceptada (P-08): esto debería vivir detrás de un puerto `PushGateway`
 * en la capa de aplicación; hoy es un helper de infraestructura invocado desde
 * el hook de cuenta.
 */

import { logger } from '@/shared/lib/logger';

import {
  getPushSubscription,
  serializePushSubscription,
  type PushSubscriptionLike,
  type PushSubscriptionLookup,
} from './push';

export interface ReleasePushOptions {
  /** Consulta inyectable; omitida usa `getPushSubscription()`. */
  getSubscription?: () => Promise<PushSubscriptionLookup>;
  /** Borrado remoto inyectable; omitido carga el adaptador de Supabase. */
  removeRemote?: (endpoint: string) => Promise<void>;
}

async function defaultRemoveRemote(endpoint: string): Promise<void> {
  const { deletePushSubscription } =
    await import('@/infrastructure/supabase/push-subscriptions.adapter');
  await deletePushSubscription(endpoint);
}

export async function releasePushOnSignOut(options: ReleasePushOptions = {}): Promise<void> {
  const getSubscription = options.getSubscription ?? (() => getPushSubscription());
  let lookup: PushSubscriptionLookup;

  try {
    lookup = await getSubscription();
  } catch (cause) {
    logger.warn('Epix: no se pudo consultar el push al cerrar sesión.', cause);
    return;
  }

  if (lookup.status !== 'subscription') {
    return;
  }

  const subscription: PushSubscriptionLike = lookup.subscription;
  const endpoint = serializePushSubscription(subscription)?.endpoint ?? subscription.endpoint;

  try {
    await (options.removeRemote ?? defaultRemoveRemote)(endpoint);
  } catch (cause) {
    logger.warn('Epix: no se pudo borrar la suscripción push al cerrar sesión.', cause);
  }

  try {
    await subscription.unsubscribe();
  } catch (cause) {
    logger.warn('Epix: no se pudo cancelar el push del navegador al cerrar sesión.', cause);
  }
}
