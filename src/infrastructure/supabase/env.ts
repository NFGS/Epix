import { appEnv, type SupabaseEnv } from '@/shared/lib/env';

export type { SupabaseEnv };

/**
 * Configuración de Supabase resuelta por `shared/lib/env` (validada con Zod).
 * Devuelve `null` si falta o es inválida: la app funciona en modo solo local.
 */
export function readSupabaseEnv(): SupabaseEnv | null {
  return appEnv.supabase;
}
