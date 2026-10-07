import type { RemoteFavorite, SyncAdapter } from '@/application/ports/sync-adapter';
import type { FavoriteShow } from '@/domain/entities/favorite';
import type { FavoritesRepository } from '@/domain/ports/favorites-repository';

import { mergeFavorites } from './merge-favorites';

export interface ApplyRemoteFavoriteDeps {
  repoFavorites: Pick<FavoritesRepository, 'add'>;
  /**
   * Lectura cruda del registro local, **incluidos los tombstones**
   * (`deletedAt`); `mergeFavorites` necesita verlos para resolver el LWW.
   */
  getLocalFavorite: (showId: number) => Promise<FavoriteShow | undefined>;
}

/**
 * Aplica un favorito llegado por Realtime con last-write-wins (reutiliza
 * `mergeFavorites`): si el remoto es más reciente (o empata) se escribe en
 * Dexie y `useLiveQuery` refresca la UI sola.
 */
export async function applyRemoteFavorite(
  deps: ApplyRemoteFavoriteDeps,
  remote: RemoteFavorite,
): Promise<void> {
  const local = await deps.getLocalFavorite(remote.showId);
  const [merged] = mergeFavorites(local === undefined ? [] : [local], [remote]);

  if (merged === undefined) {
    return;
  }

  const changed =
    local === undefined ||
    local.updatedAt !== merged.updatedAt ||
    local.deletedAt !== merged.deletedAt;

  if (changed) {
    await deps.repoFavorites.add(merged);
  }
}

export interface FavoritesRealtimeDeps extends ApplyRemoteFavoriteDeps {
  adapter: SyncAdapter;
  userId: string;
  onError?: (error: unknown) => void;
}

/**
 * Se suscribe a los cambios de `public.favorites` del usuario (Supabase
 * Realtime) y los aplica a Dexie con LWW. Devuelve la función de baja; si el
 * adaptador no soporta Realtime, es un no-op.
 */
export function startFavoritesRealtime(deps: FavoritesRealtimeDeps): () => void {
  const { subscribeFavorites } = deps.adapter;

  if (subscribeFavorites === undefined) {
    return () => undefined;
  }

  return subscribeFavorites.call(deps.adapter, deps.userId, (remote) => {
    void applyRemoteFavorite(deps, remote).catch((error: unknown) => {
      deps.onError?.(error);
    });
  });
}
