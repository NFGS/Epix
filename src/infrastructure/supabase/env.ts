export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/**
 * Lee la configuración de Supabase desde `import.meta.env`.
 * Devuelve `null` si falta alguna variable (modo solo local).
 */
export function readSupabaseEnv(): SupabaseEnv | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (url === undefined || url === '' || anonKey === undefined || anonKey === '') {
    return null;
  }

  return { url, anonKey };
}
