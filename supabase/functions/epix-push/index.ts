/**
 * epix-push — Edge Function de Supabase para Web Push (VAPID) de Epix.
 *
 * DOS MODOS (misma URL: POST /functions/v1/epix-push):
 *
 * 1. Prueba de usuario (botón «Enviar notificación de prueba» con push activo):
 *    cabecera `Authorization: Bearer <JWT de Supabase>`; se valida con
 *    `auth.getUser(jwt)` (anon key) y se envía una push de prueba a las
 *    suscripciones de ESE usuario. Cuerpo: `{ "test": true }`.
 *
 * 2. Recordatorios diarios (cron externo, p. ej. pg_cron + pg_net o GitHub
 *    Actions): cabecera `x-cron-secret` igual a `CRON_SECRET`. Recorre hasta
 *    50 usuarios con notificaciones activas y suscripciones push, consulta
 *    hasta 10 favoritos por usuario en TVmaze (`?embed=nextepisode`) y envía
 *    «Nuevo episodio hoy: Serie SxEyy» si `airdate` es la fecha de HOY en UTC.
 *
 * DEDUPE: la función está pensada para ejecutarse UNA vez al día. No lleva
 * tabla de deduplicación: una corrida diaria = un aviso por episodio. Si se
 * invocara más de una vez el mismo día, repetiría el aviso (limitación
 * documentada y aceptada).
 *
 * SECRETOS (Supabase → Edge Functions → Secrets):
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:tu@correo),
 *   CRON_SECRET. `SUPABASE_URL`, `SUPABASE_ANON_KEY` y
 *   `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase automáticamente.
 */

import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const TVMAZE_BASE = 'https://api.tvmaze.com';
const MAX_USERS = 50;
const MAX_SHOWS_PER_USER = 10;
const TVMAZE_TIMEOUT_MS = 8000;
const DEAD_SUBSCRIPTION_STATUSES: readonly number[] = [404, 410];

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PushSubscriptionRow {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface PushMessage {
  title: string;
  body: string;
  url: string;
}

interface NextEpisodeInfo {
  airdate: string;
  showName: string;
  season: number;
  episodeNumber: number;
  episodeName: string;
}

class TvMazeRateLimitError extends Error {
  constructor() {
    super('TVmaze respondió 429 (rate limit).');
    this.name = 'TvMazeRateLimitError';
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim() ?? '';

  if (value === '') {
    throw new Error(`Falta la variable de entorno ${name}.`);
  }

  return value;
}

let vapidConfigured = false;

function configureWebPush(): void {
  if (vapidConfigured) {
    return;
  }

  webpush.setVapidDetails(
    requiredEnv('VAPID_SUBJECT'),
    requiredEnv('VAPID_PUBLIC_KEY'),
    requiredEnv('VAPID_PRIVATE_KEY'),
  );
  vapidConfigured = true;
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization')?.trim() ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match === null ? null : match[1].trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** Parsea la respuesta `?embed=nextepisode` de TVmaze (tolerante a huecos). */
function readNextEpisode(payload: unknown): NextEpisodeInfo | null {
  if (!isRecord(payload)) {
    return null;
  }

  const showName = nonEmptyString(payload.name);
  const embedded = isRecord(payload._embedded) ? payload._embedded : {};
  const next = isRecord(embedded.nextepisode) ? embedded.nextepisode : null;

  if (showName === null || next === null) {
    return null;
  }

  const airdate = nonEmptyString(next.airdate);

  if (airdate === null) {
    return null;
  }

  return {
    airdate,
    showName,
    season: toNumber(next.season),
    episodeNumber: toNumber(next.number),
    episodeName: nonEmptyString(next.name) ?? '',
  };
}

/** Una llamada por serie y corrida: el cron reutiliza el resultado si hay repetidos. */
async function fetchNextEpisode(showId: number): Promise<NextEpisodeInfo | null> {
  const response = await fetch(`${TVMAZE_BASE}/shows/${showId}?embed=nextepisode`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(TVMAZE_TIMEOUT_MS),
  });

  if (response.status === 429) {
    throw new TvMazeRateLimitError();
  }

  if (!response.ok) {
    return null;
  }

  return readNextEpisode(await response.json());
}

/** Envía a las suscripciones y borra las muertas (404/410 de web-push). */
async function sendToSubscriptions(
  serviceClient: ReturnType<typeof createClient>,
  subscriptions: PushSubscriptionRow[],
  message: PushMessage,
): Promise<{ sent: number; removed: number }> {
  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    data: { url: message.url },
  });
  const deadEndpoints: string[] = [];
  let sent = 0;

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        payload,
      );
      sent += 1;
    } catch (cause) {
      const statusCode = (cause as { statusCode?: number }).statusCode;

      if (statusCode !== undefined && DEAD_SUBSCRIPTION_STATUSES.includes(statusCode)) {
        deadEndpoints.push(subscription.endpoint);
      } else {
        console.error('epix-push: fallo al enviar a una suscripción.', statusCode ?? cause);
      }
    }
  }

  if (deadEndpoints.length > 0) {
    const { error } = await serviceClient
      .from('push_subscriptions')
      .delete()
      .in('endpoint', deadEndpoints);

    if (error !== null) {
      console.error('epix-push: no se pudieron limpiar suscripciones muertas.', error.message);
    }
  }

  return { sent, removed: deadEndpoints.length };
}

async function handleTest(
  request: Request,
  serviceClient: ReturnType<typeof createClient>,
): Promise<Response> {
  const jwt = bearerToken(request);

  if (jwt === null) {
    return json({ ok: false, error: 'Falta el token de sesión (Authorization: Bearer).' }, 401);
  }

  const authClient = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_ANON_KEY'));
  const { data: userData, error: userError } = await authClient.auth.getUser(jwt);

  if (userError !== null || userData.user === null) {
    return json({ ok: false, error: 'La sesión no es válida.' }, 401);
  }

  const { data, error } = await serviceClient
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .eq('user_id', userData.user.id);

  if (error !== null) {
    return json({ ok: false, error: `No se pudieron leer las suscripciones: ${error.message}` }, 500);
  }

  const subscriptions = (data ?? []) as PushSubscriptionRow[];

  if (subscriptions.length === 0) {
    return json({ ok: false, error: 'No hay suscripciones push registradas para este usuario.' }, 404);
  }

  const result = await sendToSubscriptions(serviceClient, subscriptions, {
    title: 'Epix — Notificaciones push activas',
    body: 'Todo listo: recibirás avisos cuando tus series favoritas estrenen episodio.',
    url: '/account',
  });

  if (result.sent === 0) {
    return json({ ok: false, error: 'No se pudo entregar la notificación de prueba.' }, 502);
  }

  return json({ ok: true, sent: result.sent, removed: result.removed });
}

async function handleCron(
  request: Request,
  serviceClient: ReturnType<typeof createClient>,
): Promise<Response> {
  const secret = Deno.env.get('CRON_SECRET')?.trim() ?? '';

  if (secret === '') {
    return json({ ok: false, error: 'CRON_SECRET no está configurado.' }, 500);
  }

  const provided = request.headers.get('x-cron-secret')?.trim() ?? '';

  if (provided === '' || provided !== secret) {
    return json({ ok: false, error: 'Secreto de cron inválido.' }, 401);
  }

  const todayUtc = new Date().toISOString().slice(0, 10);

  const { data: preferences, error: preferencesError } = await serviceClient
    .from('preferences')
    .select('user_id')
    .eq('notifications_enabled', true)
    .limit(MAX_USERS);

  if (preferencesError !== null) {
    return json(
      { ok: false, error: `No se pudieron leer las preferencias: ${preferencesError.message}` },
      500,
    );
  }

  const userIds = ((preferences ?? []) as Array<{ user_id: string }>).map((row) => row.user_id);

  if (userIds.length === 0) {
    return json({ ok: true, date: todayUtc, users: 0, checkedShows: 0, sent: 0, removed: 0 });
  }

  // Solo usuarios con al menos una suscripción push viva (evita trabajo inútil).
  const { data: subscriptionRows, error: subscriptionsError } = await serviceClient
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', userIds);

  if (subscriptionsError !== null) {
    return json(
      { ok: false, error: `No se pudieron leer las suscripciones: ${subscriptionsError.message}` },
      500,
    );
  }

  const subscriptionsByUser = new Map<string, PushSubscriptionRow[]>();

  for (const row of (subscriptionRows ?? []) as PushSubscriptionRow[]) {
    const current = subscriptionsByUser.get(row.user_id) ?? [];
    current.push(row);
    subscriptionsByUser.set(row.user_id, current);
  }

  const episodeCache = new Map<number, NextEpisodeInfo | null>();
  let checkedShows = 0;
  let sent = 0;
  let removed = 0;

  for (const [userId, subscriptions] of subscriptionsByUser) {
    const { data: favorites, error: favoritesError } = await serviceClient
      .from('favorites')
      .select('show_id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .limit(MAX_SHOWS_PER_USER);

    if (favoritesError !== null) {
      console.error(`epix-push: no se pudieron leer favoritos de ${userId}.`, favoritesError.message);
      continue;
    }

    for (const favorite of (favorites ?? []) as Array<{ show_id: number }>) {
      checkedShows += 1;

      try {
        let next = episodeCache.get(favorite.show_id);

        if (next === undefined) {
          next = await fetchNextEpisode(favorite.show_id);
          episodeCache.set(favorite.show_id, next);
        }

        if (next === null || next.airdate !== todayUtc) {
          continue;
        }

        const result = await sendToSubscriptions(serviceClient, subscriptions, {
          title: `Nuevo episodio hoy: ${next.showName}`,
          body: `${next.showName} — S${pad2(next.season)}E${pad2(next.episodeNumber)}${
            next.episodeName === '' ? '' : ` · ${next.episodeName}`
          }`,
          url: `/shows/${favorite.show_id}`,
        });

        sent += result.sent;
        removed += result.removed;
      } catch (cause) {
        if (cause instanceof TvMazeRateLimitError) {
          // Corta la corrida sin castigar la API: se reporta como parcial.
          return json({
            ok: true,
            date: todayUtc,
            stopped: 'rate-limit',
            users: subscriptionsByUser.size,
            checkedShows,
            sent,
            removed,
          });
        }

        console.error('epix-push: error consultando TVmaze.', cause);
      }
    }
  }

  return json({
    ok: true,
    date: todayUtc,
    users: subscriptionsByUser.size,
    checkedShows,
    sent,
    removed,
  });
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Método no permitido. Usa POST.' }, 405);
  }

  try {
    const serviceClient = createClient(
      requiredEnv('SUPABASE_URL'),
      requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    configureWebPush();

    if (request.headers.get('x-cron-secret') !== null) {
      return await handleCron(request, serviceClient);
    }

    return await handleTest(request, serviceClient);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Error inesperado.';
    console.error('epix-push:', message);
    return json({ ok: false, error: message }, 500);
  }
});
