/**
 * Evento de telemetría de uso (RF-11 / RNF-03).
 * Solo se registra con consentimiento (`telemetryEnabled`) y con el mínimo
 * necesario: fecha/hora, zona horaria, opciones usadas y búsquedas.
 */

/** Catálogo curado de eventos (`docs/modelo-datos.md` §4). */
export type UsageEventType =
  | 'session_start'
  | 'session_end'
  | 'screen_view'
  | 'search'
  | 'show_open'
  | 'episode_list_open'
  | 'favorite_add'
  | 'favorite_remove'
  | 'filter_change'
  | 'preference_change'
  | 'theme_change'
  | 'gps_used'
  | 'notification_permission'
  | 'notification_shown'
  | 'notification_open'
  | 'sync_success'
  | 'sync_error'
  | 'offline_start'
  | 'offline_end';

/** Valor JSON serializable dentro del payload (sin `undefined` ni funciones). */
export type UsageEventValue =
  string | number | boolean | null | UsageEventValue[] | { [key: string]: UsageEventValue };

export type UsageEventPayload = { [key: string]: UsageEventValue };

export interface UsageEvent {
  id: string;
  eventType: UsageEventType;
  occurredAt: string;
  timezone: string;
  country?: string;
  appVersion: string;
  payload?: UsageEventPayload;
}

const MAX_STRING_LENGTH = 200;
const MAX_DEPTH = 4;

/** Claves que jamás salen del dispositivo (datos personales o sensibles). */
const SENSITIVE_KEY_PATTERN =
  /(password|passwd|pass|token|secret|credential|email|phone|coords?|latitude|longitude|\blat\b|\blng\b|\blon\b)/i;

function sanitizeValue(value: unknown, depth: number): UsageEventValue | undefined {
  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (depth >= MAX_DEPTH) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item, depth + 1))
      .filter((item): item is UsageEventValue => item !== undefined);
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key))
      .map(([key, item]) => [key, sanitizeValue(item, depth + 1)] as const)
      .filter(([, item]) => item !== undefined);

    return Object.fromEntries(entries) as UsageEventPayload;
  }

  return undefined;
}

/**
 * Limpia el payload antes de persistirlo: elimina `undefined`, funciones y
 * claves sensibles, recorta cadenas largas y limita la profundidad.
 * Devuelve `undefined` si no queda nada útil.
 */
export function sanitizePayload(
  payload: Record<string, unknown> | undefined,
): UsageEventPayload | undefined {
  if (payload === undefined) {
    return undefined;
  }

  const clean: UsageEventPayload = {};

  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      continue;
    }

    const sanitized = sanitizeValue(value, 0);
    if (sanitized !== undefined) {
      clean[key] = sanitized;
    }
  }

  return Object.keys(clean).length === 0 ? undefined : clean;
}
