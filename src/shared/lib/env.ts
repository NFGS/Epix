import { z } from 'zod';

import { logger } from './logger';

/** Configuración de Supabase ya validada. */
export interface SupabaseEnv {
  url: string;
  anonKey: string;
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
}

const envSourceSchema = z.object({
  MODE: z.string().catch('production'),
  DEV: z.boolean().catch(false),
  PROD: z.boolean().catch(true),
  VITE_SUPABASE_URL: z.string().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().optional(),
});

const supabaseUrlSchema = z.url();

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

  if (!supabaseUrlSchema.safeParse(url).success) {
    warnInvalidUrlOnce();
    return null;
  }

  return { url, anonKey };
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

/** Entorno real de la aplicación, validado una sola vez al arrancar. */
export const appEnv: AppEnv = resolveAppEnv(import.meta.env);
