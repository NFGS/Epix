/**
 * P-15: parseo puro del payload de una notificación push, extraído de `sw.ts`
 * para poder probarlo sin un `PushEvent` real.
 *
 * Acepta:
 * - JSON con `{ title, body, data: { url } }` o `{ title, body, url }`;
 * - texto plano (se usa como cuerpo de la notificación);
 * - payload vacío o binario irreconocible → `{}` (la UI aplica textos genéricos).
 */

export interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
}

/** Objeto mínimo de `PushMessageData` para inyectar dobles en pruebas. */
export interface PushMessageDataLike {
  json(): unknown;
  text(): string;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function normalizePushPayload(value: unknown): PushPayload {
  if (typeof value !== 'object' || value === null) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const nested =
    typeof record.data === 'object' && record.data !== null
      ? (record.data as Record<string, unknown>)
      : {};
  const payload: PushPayload = {};

  const title = nonEmptyString(record.title);
  const body = nonEmptyString(record.body);
  const url = nonEmptyString(record.url) ?? nonEmptyString(nested.url);

  if (title !== null) {
    payload.title = title;
  }
  if (body !== null) {
    payload.body = body;
  }
  if (url !== null) {
    payload.url = url;
  }

  return payload;
}

export function parsePushPayload(data: PushMessageDataLike | null | undefined): PushPayload {
  if (data === null || data === undefined) {
    return {};
  }

  try {
    return normalizePushPayload(data.json());
  } catch {
    try {
      const text = nonEmptyString(data.text());
      return text === null ? {} : { body: text };
    } catch {
      return {};
    }
  }
}
