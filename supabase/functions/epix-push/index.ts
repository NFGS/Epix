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
 *    MAX_USERS usuarios con suscripciones push, consulta hasta
 *    MAX_SHOWS_PER_USER favoritos por usuario en TVmaze
 *    (`?embed=nextepisode`) y envía «Nuevo episodio hoy: Serie SxEyy» cuando
 *    `airdate` cae en la ventana de fechas aceptada (ver FECHAS).
 *
 * ELEGIBILIDAD (P-01): la fuente de verdad del cron son las filas de
 * `push_subscriptions` (distinct user_id), NO
 * `preferences.notifications_enabled`: esa preferencia es estado local del
 * dispositivo y la nube no la consulta para decidir a quién avisar. Un usuario
 * sin suscripciones no recibe nada ni genera trabajo.
 *
 * ORDEN Y PACING (P-11, P-02): las suscripciones se leen ordenadas por
 * `created_at` ascendente para atender primero a los usuarios más antiguos
 * (sin hambruna); las llamadas a TVmaze se espacian ~300 ms y una corrida
 * consulta como máximo `MAX_SHOW_LOOKUPS` series distintas (30 por defecto)
 * para no acercarse al rate limit de TVmaze (≥ 20 llamadas/10 s por IP).
 * Al alcanzar el tope la corrida termina como parcial (`stopped: "lookup-cap"`).
 *
 * FECHAS (P-10): `airdate` de TVmaze es una fecha de calendario sin hora ni
 * zona. El cron corre en UTC y el público objetivo está en UTC-5: una corrida
 * acepta la fecha de HOY o AYER en UTC-5 (ver `airdate-window.ts`) para no
 * perder el estreno ni mandarlo tarde.
 *
 * DEDUPE: la función está pensada para ejecutarse UNA vez al día. No lleva
 * tabla de deduplicación: una corrida diaria = un aviso por episodio. Si se
 * invocara más de una vez el mismo día, repetiría el aviso (limitación
 * documentada y aceptada).
 *
 * SEGURIDAD:
 *   - E-01: `CRON_SECRET` debe medir >= 32 caracteres (si no → 500 genérico);
 *     se compara en tiempo constante (SHA-256 + XOR byte a byte).
 *   - E-02: CORS restringido a `ALLOWED_ORIGIN` (lista separada por comas; por
 *     defecto https://epix-xi.vercel.app) más `http://localhost:5173` para
 *     desarrollo. El cron es servidor→servidor, por eso `x-cron-secret` NO se
 *     anuncia en `Access-Control-Allow-Headers`.
 *   - E-03: los mensajes de error internos solo van a `console.error`; el
 *     cliente recibe mensajes genéricos («Error interno»).
 *   - E-04: antes de enviar se valida el endpoint contra la allowlist de
 *     servicios push (`isTrustedPushEndpoint`); los que no pasan se eliminan
 *     como dato corrupto.
 *
 * SECRETOS (Supabase → Edge Functions → Secrets):
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:tu@correo),
 *   CRON_SECRET (>= 32 caracteres). Opcionales: ALLOWED_ORIGIN y
 *   MAX_SHOW_LOOKUPS. `SUPABASE_URL`, `SUPABASE_ANON_KEY` y
 *   `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase automáticamente.
 */

import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

import { isAirdateInWindow, scheduleDateWindow } from './airdate-window.ts';
import { corsDecision } from './cors.ts';
import { errorName } from './error-name.ts';
import { isTrustedPushEndpoint } from './push-endpoint.ts';
import { timingSafeStringEqual } from './timing-safe.ts';

const TVMAZE_BASE = 'https://api.tvmaze.com';
const MAX_USERS = 50;
const MAX_SHOWS_PER_USER = 10;
const DEFAULT_MAX_SHOW_LOOKUPS = 30;
const MAX_SUBSCRIPTION_ROWS = 500;
const TVMAZE_TIMEOUT_MS = 8000;
const TVMAZE_PACE_MS = 300;
const MIN_CRON_SECRET_LENGTH = 32;
const DEAD_SUBSCRIPTION_STATUSES: readonly number[] = [404, 410];
const GENERIC_INTERNAL_ERROR = 'Error interno';

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

/**
 * Cabeceras CORS para el origen de la petición (ver `cors.ts`): `null` si el
 * navegador envía un `Origin` no permitido (se rechaza), `{}` para peticiones
 * sin `Origin` (cron servidor→servidor, que no usa CORS).
 */
function corsHeaders(request: Request): Record<string, string> | null {
  const decision = corsDecision(request.headers.get('Origin'), Deno.env.get('ALLOWED_ORIGIN'));
  return decision.allowed ? decision.headers : null;
}

function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...(corsHeaders(request) ?? {}),
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim() ?? '';

  if (value === '') {
    throw new Error(`Falta la variable de entorno ${name}.`);
  }

  return value;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value?.trim() ?? '', 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function safeOrigin(endpoint: string): string {
  try {
    return new URL(endpoint).origin;
  } catch {
    return 'invalid';
  }
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

/**
 * Envía a las suscripciones y borra las inválidas: endpoints fuera de la
 * allowlist de servicios push (E-04) y muertas (404/410 de web-push).
 */
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
  const removedEndpoints: string[] = [];
  let sent = 0;

  for (const subscription of subscriptions) {
    if (!isTrustedPushEndpoint(subscription.endpoint)) {
      // El endpoint es una URL-capacidad: se registra solo el origen, no el
      // token completo.
      console.error('epix-push: se elimina una suscripción con endpoint no confiable.', {
        origin: safeOrigin(subscription.endpoint),
      });
      removedEndpoints.push(subscription.endpoint);
      continue;
    }

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
        removedEndpoints.push(subscription.endpoint);
      } else {
        console.error('epix-push: fallo al enviar a una suscripción.', statusCode ?? cause);
      }
    }
  }

  if (removedEndpoints.length > 0) {
    const { error } = await serviceClient
      .from('push_subscriptions')
      .delete()
      .in('endpoint', removedEndpoints);

    if (error !== null) {
      console.error('epix-push: no se pudieron limpiar suscripciones inválidas.', {
        code: error.code,
        message: error.message,
      });
    }
  }

  return { sent, removed: removedEndpoints.length };
}

async function handleTest(
  request: Request,
  serviceClient: ReturnType<typeof createClient>,
): Promise<Response> {
  const jwt = bearerToken(request);

  if (jwt === null) {
    return json(
      request,
      { ok: false, error: 'Falta el token de sesión (Authorization: Bearer).' },
      401,
    );
  }

  const authClient = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_ANON_KEY'));
  const { data: userData, error: userError } = await authClient.auth.getUser(jwt);

  if (userError !== null || userData.user === null) {
    return json(request, { ok: false, error: 'La sesión no es válida.' }, 401);
  }

  const { data, error } = await serviceClient
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .eq('user_id', userData.user.id);

  if (error !== null) {
    console.error('epix-push: no se pudieron leer las suscripciones del usuario.', {
      code: error.code,
      message: error.message,
    });
    return json(request, { ok: false, error: GENERIC_INTERNAL_ERROR }, 500);
  }

  const subscriptions = (data ?? []) as PushSubscriptionRow[];

  if (subscriptions.length === 0) {
    return json(
      request,
      { ok: false, error: 'No hay suscripciones push registradas para este usuario.' },
      404,
    );
  }

  const result = await sendToSubscriptions(serviceClient, subscriptions, {
    title: 'Epix — Notificaciones push activas',
    body: 'Todo listo: recibirás avisos cuando tus series favoritas estrenen episodio.',
    url: '/account',
  });

  if (result.sent === 0) {
    return json(
      request,
      { ok: false, error: 'No se pudo entregar la notificación de prueba.' },
      502,
    );
  }

  return json(request, { ok: true, sent: result.sent, removed: result.removed });
}

async function handleCron(
  request: Request,
  serviceClient: ReturnType<typeof createClient>,
): Promise<Response> {
  const secret = Deno.env.get('CRON_SECRET')?.trim() ?? '';

  if (secret.length < MIN_CRON_SECRET_LENGTH) {
    console.error(
      `epix-push: CRON_SECRET ausente o demasiado corto (mínimo ${MIN_CRON_SECRET_LENGTH} caracteres).`,
    );
    return json(request, { ok: false, error: GENERIC_INTERNAL_ERROR }, 500);
  }

  const provided = request.headers.get('x-cron-secret')?.trim() ?? '';

  if (provided === '' || !(await timingSafeStringEqual(provided, secret))) {
    return json(request, { ok: false, error: 'Secreto de cron inválido.' }, 401);
  }

  const dateWindow = scheduleDateWindow();
  const maxShowLookups = positiveInt(Deno.env.get('MAX_SHOW_LOOKUPS'), DEFAULT_MAX_SHOW_LOOKUPS);

  // P-01/P-11: la elegibilidad son las suscripciones y el orden por creación
  // evita que los usuarios nuevos desplacen siempre a los antiguos.
  const { data: subscriptionRows, error: subscriptionsError } = await serviceClient
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .order('created_at', { ascending: true })
    .limit(MAX_SUBSCRIPTION_ROWS);

  if (subscriptionsError !== null) {
    console.error('epix-push: no se pudieron leer las suscripciones.', {
      code: subscriptionsError.code,
      message: subscriptionsError.message,
    });
    return json(request, { ok: false, error: GENERIC_INTERNAL_ERROR }, 500);
  }

  const subscriptionsByUser = new Map<string, PushSubscriptionRow[]>();

  for (const row of (subscriptionRows ?? []) as PushSubscriptionRow[]) {
    const current = subscriptionsByUser.get(row.user_id) ?? [];
    current.push(row);
    subscriptionsByUser.set(row.user_id, current);
  }

  const users = [...subscriptionsByUser.entries()].slice(0, MAX_USERS);
  const episodeCache = new Map<number, NextEpisodeInfo | null>();
  let checkedShows = 0;
  let lookups = 0;
  let sent = 0;
  let removed = 0;

  const summary = (stopped?: 'rate-limit' | 'lookup-cap') => ({
    ok: true,
    date: dateWindow.today,
    window: dateWindow,
    ...(stopped === undefined ? {} : { stopped }),
    users: users.length,
    checkedShows,
    lookups,
    sent,
    removed,
  });

  for (const [userId, subscriptions] of users) {
    const { data: favorites, error: favoritesError } = await serviceClient
      .from('favorites')
      .select('show_id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .limit(MAX_SHOWS_PER_USER);

    if (favoritesError !== null) {
      console.error('epix-push: no se pudieron leer favoritos de un usuario.', {
        userId,
        code: favoritesError.code,
        message: favoritesError.message,
      });
      continue;
    }

    for (const favorite of (favorites ?? []) as Array<{ show_id: number }>) {
      checkedShows += 1;
      let next = episodeCache.get(favorite.show_id);

      if (next === undefined) {
        if (lookups >= maxShowLookups) {
          return json(request, summary('lookup-cap'));
        }

        if (lookups > 0) {
          await sleep(TVMAZE_PACE_MS);
        }

        lookups += 1;

        try {
          next = await fetchNextEpisode(favorite.show_id);
          episodeCache.set(favorite.show_id, next);
        } catch (cause) {
          if (cause instanceof TvMazeRateLimitError) {
            // Corta la corrida sin castigar la API: se reporta como parcial.
            return json(request, summary('rate-limit'));
          }

          console.error('epix-push: error consultando TVmaze.', cause);
          continue;
        }
      }

      if (next === null || !isAirdateInWindow(next.airdate)) {
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
    }
  }

  return json(request, summary());
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    const headers = corsHeaders(request);

    if (headers === null) {
      return new Response('Origen no permitido.', { status: 403 });
    }

    return new Response(null, { status: 204, headers });
  }

  if (request.method !== 'POST') {
    return json(request, { ok: false, error: 'Método no permitido. Usa POST.' }, 405);
  }

  if (corsHeaders(request) === null) {
    return new Response(JSON.stringify({ ok: false, error: 'Origen no permitido.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
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
    console.error('epix-push: error interno.', {
      name: errorName(cause),
      message: cause instanceof Error ? cause.message : String(cause),
    });
    return json(request, { ok: false, error: GENERIC_INTERNAL_ERROR }, 500);
  }
});
