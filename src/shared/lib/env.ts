import { z } from 'zod';

import { logger } from './logger';

/** Configuración de Supabase ya validada. */
export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/** Configuración de Sentry ya validada (reportes de errores opcionales). */
export interface SentryEnv {
  dsn: string;
  environment: string;
}

/** Entorno de la aplicación resuelto y tipado (P2-5). */
export interface AppEnv {
  readonly mode: string;
  readonly isDev: boolean;
  readonly isProd: boolean;
  /** `null` cuando no hay configuración válida: la app funciona solo local. */
  readonly supabase: SupabaseEnv | null;
}

/** Subconjunto de `import.meta.env` que Epix necesita; facilita probar escenarios. */
export interface EnvSource {
  readonly MODE?: string;
  readonly DEV?: boolean;
  readonly PROD?: boolean;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
}

const envSourceSchema = z.object({
  MODE: z.string().catch('production'),
  DEV: z.boolean().catch(false),
  PROD: z.boolean().catch(true),
  VITE_SUPABASE_URL: z.string().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().optional(),
  VITE_VAPID_PUBLIC_KEY: z.string().optional(),
  VITE_SENTRY_DSN: z.string().optional(),
  VITE_SENTRY_ENVIRONMENT: z.string().optional(),
});

const urlSchema = z.url();

let invalidUrlWarned = false;

function warnInvalidUrlOnce(): void {
  if (invalidUrlWarned) {
    return;
  }

  invalidUrlWarned = true;
  logger.warn(
    'Epix: VITE_SUPABASE_URL no es una URL válida; se activará el modo solo local.',
  );
}

/**
 * Resuelve la configuración de Supabase:
 * - ausente o vacía → `null` (solo local, sin ruido);
 * - definida pero inválida → `null` + un único aviso (no rompe la app);
 * - válida → `{ url, anonKey }`.
 */
function resolveSupabase(source: EnvSource): SupabaseEnv | null {
  const url = source.VITE_SUPABASE_URL?.trim() ?? '';
  const anonKey = source.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

  if (url === '' || anonKey === '') {
    return null;
  }

  if (!urlSchema.safeParse(url).success) {
    warnInvalidUrlOnce();
    return null;
  }

  return { url, anonKey };
}

let invalidSentryDsnWarned = false;

function warnInvalidSentryDsnOnce(): void {
  if (invalidSentryDsnWarned) {
    return;
  }

  invalidSentryDsnWarned = true;
  logger.warn(
    'Epix: VITE_SENTRY_DSN no es una URL válida; los reportes de errores quedarán desactivados.',
  );
}

/**
 * Resuelve la configuración de Sentry:
 * - ausente o vacía → `null` (sin SDK, sin peticiones, sin peso);
 * - definida pero inválida → `null` + un único aviso (no rompe la app);
 * - válida → `{ dsn, environment }`, donde `environment` cae a `MODE`.
 */
export function resolveSentryConfig(
  source: Pick<EnvSource, 'MODE' | 'VITE_SENTRY_DSN' | 'VITE_SENTRY_ENVIRONMENT'> = import.meta.env,
): SentryEnv | null {
  const dsn = source.VITE_SENTRY_DSN?.trim() ?? '';

  if (dsn === '') {
    return null;
  }

  if (!urlSchema.safeParse(dsn).success) {
    warnInvalidSentryDsnOnce();
    return null;
  }

  const environment = source.VITE_SENTRY_ENVIRONMENT?.trim() ?? '';

  return {
    dsn,
    environment: environment === '' ? (source.MODE ?? 'production') : environment,
  };
}

/** Construye el entorno tipado a partir de una fuente (p. ej. `import.meta.env`). */
export function resolveAppEnv(source: EnvSource): AppEnv {
  const parsed = envSourceSchema.safeParse(source);
  const mode = parsed.success ? parsed.data.MODE : 'production';
  const isDev = parsed.success ? parsed.data.DEV : false;
  const isProd = parsed.success ? parsed.data.PROD : true;

  return {
    mode,
    isDev,
    isProd,
    supabase: resolveSupabase(source),
  };
}

/**
 * Clave pública VAPID para Web Push (opcional).
 *
 * Se lee `import.meta.env` en cada llamada (igual que el logger) para que las
 * pruebas puedan simularla con `vi.stubEnv` sin reimportar el módulo. Sin ella,
 * toda la UI de push queda oculta y la app funciona exactamente igual.
 */
export function resolveVapidPublicKey(
  source: Pick<EnvSource, 'VITE_VAPID_PUBLIC_KEY'> = import.meta.env,
): string | null {
  const key = source.VITE_VAPID_PUBLIC_KEY?.trim() ?? '';
  return key === '' ? null : key;
}

/** Entorno real de la aplicación, validado una sola vez al arrancar. */
export const appEnv: AppEnv = resolveAppEnv(import.meta.env);
