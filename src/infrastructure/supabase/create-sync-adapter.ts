import type { SyncAdapter } from '@/application/ports/sync-adapter';

import { readSupabaseEnv } from './env';

/** `true` cuando existen `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. */
export function hasSupabaseConfig(): boolean {
  return readSupabaseEnv() !== null;
}

/**
 * Adaptador perezoso: `@supabase/supabase-js` se carga en un chunk aparte
 * únicamente cuando hay configuración y se sincroniza por primera vez.
 * Trade-off: la primera sincronización espera la descarga del chunk.
 */
export function createLazySupabaseSyncAdapter(): SyncAdapter {
  let adapterPromise: Promise<SyncAdapter> | null = null;

  function load(): Promise<SyncAdapter> {
    adapterPromise ??= import('./supabase-sync.adapter').then(async (module) => {
      const adapter = module.createSupabaseSyncAdapterFromEnv();

      if (adapter === null) {
        throw new Error('Supabase dejó de estar configurado.');
      }

      return adapter;
    });

    return adapterPromise;
  }

  return {
    ensureSession: async () => (await load()).ensureSession(),
    pullFavorites: async (sinceIso) => (await load()).pullFavorites(sinceIso),
    upsertFavorites: async (favorites) => (await load()).upsertFavorites(favorites),
    deleteFavorites: async (showIds) => (await load()).deleteFavorites(showIds),
    pushHistory: async (entries) => (await load()).pushHistory(entries),
    clearRemoteHistory: async () => (await load()).clearRemoteHistory(),
    pushEvents: async (events) => (await load()).pushEvents(events),
    clearRemoteEvents: async () => (await load()).clearRemoteEvents(),
  };
}
