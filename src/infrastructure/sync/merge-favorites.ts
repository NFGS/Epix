import type { RemoteFavorite } from '@/application/ports/sync-adapter';
import type { FavoriteShow } from '@/domain/entities/favorite';

/** Convierte un favorito remoto al registro local (siempre `synced`). */
export function favoriteFromRemote(remote: RemoteFavorite): FavoriteShow {
  return {
    showId: remote.showId,
    name: remote.snapshot.name ?? '',
    genres: [...(remote.snapshot.genres ?? [])],
    imageMedium: remote.snapshot.imageMedium,
    premiered: remote.snapshot.premiered,
    rating: remote.snapshot.rating,
    addedAt: remote.addedAt,
    updatedAt: remote.updatedAt,
    deletedAt: remote.deletedAt,
    syncStatus: 'synced',
  };
}

/**
 * Fusiona favoritos locales y remotos con last-write-wins por `updatedAt`.
 * Los elementos solo locales se conservan (aún pueden estar pendientes de push);
 * los remotos ganan únicamente si son estrictamente más recientes.
 */
export function mergeFavorites(
  local: readonly FavoriteShow[],
  remote: readonly RemoteFavorite[],
): FavoriteShow[] {
  const merged = new Map<number, FavoriteShow>();

  for (const favorite of local) {
    merged.set(favorite.showId, favorite);
  }

  for (const remoteFavorite of remote) {
    const localFavorite = merged.get(remoteFavorite.showId);

    if (localFavorite === undefined || remoteFavorite.updatedAt > localFavorite.updatedAt) {
      merged.set(remoteFavorite.showId, favoriteFromRemote(remoteFavorite));
    }
  }

  return [...merged.values()].sort((a, b) => a.showId - b.showId);
}
