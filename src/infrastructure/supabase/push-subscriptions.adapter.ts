/**
 * Adaptador de `public.push_subscriptions` (RLS por `auth.uid()`).
 *
 * - `savePushSubscription`: llama a la RPC `claim_push_subscription`
 *   (migración 005), que reasigna el endpoint a la cuenta actual de forma
 *   atómica incluso en un navegador compartido (el `endpoint` es único global
 *   y RLS impide que un usuario toque la fila de otro). Si la RPC aún no está
 *   desplegada, cae con elegancia al upsert directo por `endpoint`.
 * - `deletePushSubscription`: borra la fila del endpoint (RLS limita al dueño).
 * - `listMySubscriptions`: lee y valida las suscripciones propias.
 * - `sendTestPush`: invoca la Edge Function `epix-push` en modo prueba con el
 *   JWT de la sesión (el envío real ocurre en el servidor con VAPID).
 *
 * Solo se usa la anon key en el cliente; la service_role vive en la función.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import type { SerializedPushSubscription } from '@/infrastructure/notifications/push';
import type { SupabaseEnv } from '@/shared/lib/env';
import { logger } from '@/shared/lib/logger';

import { getSupabaseClient } from './client';
import { readSupabaseEnv } from './env';

export type PushSubscriptionsErrorCode =
  'unconfigured' | 'session' | 'save' | 'delete' | 'list' | 'test';

export class PushSubscriptionsError extends Error {
  readonly code: PushSubscriptionsErrorCode;

  constructor(code: PushSubscriptionsErrorCode, message: string) {
    super(message);
    this.name = 'PushSubscriptionsError';
    this.code = code;
  }
}

export const pushSubscriptionRowSchema = z.object({
  endpoint: z.string().min(1),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  created_at: z.string().min(1),
});

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}

export interface PushSubscriptionsOptions {
  /** Cliente de Supabase; omitido usa `getSupabaseClient()` (null → error legible). */
  client?: SupabaseClient | null;
  /** Configuración de Supabase; omitida usa `readSupabaseEnv()`. */
  env?: SupabaseEnv | null;
  /** `fetch` inyectable para pruebas; omitido usa el global. */
  fetchFn?: typeof fetch;
}

interface PostgrestErrorLike {
  message: string;
  code?: string;
}

/**
 * `true` cuando el error indica que la RPC `claim_push_subscription` no existe
 * todavía en el proyecto (migración 005 sin aplicar). PostgREST responde
 * `PGRST202` («Could not find the function … in the schema cache»).
 */
function isClaimRpcMissing(error: PostgrestErrorLike): boolean {
  return (
    error.code === 'PGRST202' ||
    (error.message.includes('claim_push_subscription') &&
      (error.message.includes('Could not find') || error.message.includes('does not exist')))
  );
}

function resolveClient(options: PushSubscriptionsOptions): SupabaseClient {
  const client = options.client !== undefined ? options.client : getSupabaseClient();

  if (client === null) {
    throw new PushSubscriptionsError(
      'unconfigured',
      'Supabase no está configurado en este dispositivo.',
    );
  }

  return client;
}

function resolveEnv(options: PushSubscriptionsOptions): SupabaseEnv {
  const env = options.env !== undefined ? options.env : readSupabaseEnv();

  if (env === null) {
    throw new PushSubscriptionsError(
      'unconfigured',
      'Supabase no está configurado en este dispositivo.',
    );
  }

  return env;
}

function resolveFetch(options: PushSubscriptionsOptions): typeof fetch {
  const fetchFn = options.fetchFn ?? globalThis.fetch;

  if (typeof fetchFn !== 'function') {
    throw new PushSubscriptionsError(
      'unconfigured',
      'Este entorno no dispone de fetch para llamar a la función de push.',
    );
  }

  return fetchFn;
}

function assertNoError(
  error: PostgrestErrorLike | null,
  code: PushSubscriptionsErrorCode,
  context: string,
): void {
  if (error !== null) {
    throw new PushSubscriptionsError(code, `${context}: ${error.message}`);
  }
}

/** Sesión actual o sesión anónima nueva (mismo criterio que el sync). */
async function ensureUserId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getSession();
  assertNoError(error, 'session', 'No se pudo leer la sesión');

  if (data.session !== null) {
    return data.session.user.id;
  }

  const { data: signInData, error: signInError } = await client.auth.signInAnonymously();
  assertNoError(signInError, 'session', 'No se pudo iniciar la sesión anónima');

  if (signInData.user === null) {
    throw new PushSubscriptionsError('session', 'Supabase no devolvió un usuario anónimo.');
  }

  return signInData.user.id;
}

/**
 * Guarda (o reasigna) la suscripción del navegador actual.
 *
 * Con la RPC `claim_push_subscription` la reasignación es atómica y permitida
 * por RLS (security definer). Sin ella (proyecto sin la migración 005) se usa
 * el upsert directo, que funciona mientras el endpoint no pertenezca a otra
 * cuenta.
 */
export async function savePushSubscription(
  subscription: SerializedPushSubscription,
  options: PushSubscriptionsOptions = {},
): Promise<void> {
  const client = resolveClient(options);
  const userId = await ensureUserId(client);

  const { error } = await client.rpc('claim_push_subscription', {
    p_endpoint: subscription.endpoint,
    p_p256dh: subscription.p256dh,
    p_auth: subscription.auth,
  });

  if (error === null) {
    return;
  }

  if (!isClaimRpcMissing(error)) {
    throw new PushSubscriptionsError(
      'save',
      `No se pudo guardar la suscripción push: ${error.message}`,
    );
  }

  const { error: fallbackError } = await client.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
    { onConflict: 'endpoint' },
  );

  assertNoError(fallbackError, 'save', 'No se pudo guardar la suscripción push');
}

/** Borra la fila del endpoint (RLS: solo si pertenece al usuario actual). */
export async function deletePushSubscription(
  endpoint: string,
  options: PushSubscriptionsOptions = {},
): Promise<void> {
  const client = resolveClient(options);
  const { error } = await client.from('push_subscriptions').delete().eq('endpoint', endpoint);

  assertNoError(error, 'delete', 'No se pudo borrar la suscripción push');
}

/** Lee las suscripciones propias; las filas corruptas se omiten con aviso. */
export async function listMySubscriptions(
  options: PushSubscriptionsOptions = {},
): Promise<PushSubscriptionRecord[]> {
  const client = resolveClient(options);
  const userId = await ensureUserId(client);

  const { data, error } = await client
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, created_at')
    .eq('user_id', userId);

  assertNoError(error, 'list', 'No se pudieron leer las suscripciones push');

  const rows: unknown[] = data ?? [];
  const records: PushSubscriptionRecord[] = [];

  for (const row of rows) {
    const parsed = pushSubscriptionRowSchema.safeParse(row);

    if (!parsed.success) {
      logger.warn(
        'Epix: fila de suscripción push omitida por datos inválidos.',
        parsed.error.message,
      );
      continue;
    }

    records.push({
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
      createdAt: parsed.data.created_at,
    });
  }

  return records;
}

/**
 * Pide a `epix-push` una push de prueba para las suscripciones de este usuario.
 * Lanza `PushSubscriptionsError` si no hay sesión o la función responde error.
 */
export async function sendTestPush(options: PushSubscriptionsOptions = {}): Promise<void> {
  const client = resolveClient(options);
  const env = resolveEnv(options);
  const fetchFn = resolveFetch(options);

  const { data, error } = await client.auth.getSession();
  assertNoError(error, 'session', 'No se pudo leer la sesión');

  const token = data.session?.access_token ?? null;

  if (token === null) {
    throw new PushSubscriptionsError(
      'session',
      'No hay una sesión activa para enviar la push de prueba.',
    );
  }

  let response: Response;

  try {
    response = await fetchFn(`${env.url}/functions/v1/epix-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: env.anonKey,
      },
      body: JSON.stringify({ test: true }),
    });
  } catch (cause) {
    throw new PushSubscriptionsError(
      'test',
      cause instanceof Error ? cause.message : 'No se pudo contactar la función de push.',
    );
  }

  if (!response.ok) {
    throw new PushSubscriptionsError(
      'test',
      `La función de push respondió con estado ${response.status}.`,
    );
  }
}
