import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { readSupabaseEnv } from './env';

let cachedClient: SupabaseClient | null | undefined;

/**
 * Cliente de Supabase leyendo las variables de entorno de Vite.
 * Devuelve `null` cuando falta la configuración: la app funciona solo local.
 * Nunca se usa `service_role` en el cliente (solo la anon key con RLS).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const env = readSupabaseEnv();

  cachedClient =
    env === null
      ? null
      : createClient(env.url, env.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
          },
        });

  return cachedClient;
}
