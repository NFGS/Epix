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
 * ¿Gana el remoto? Last-write-wins por `updatedAt` con desempate determinista
 * (R-05): a igualdad de `updatedAt` compara `deletedAt` (el tombstone más
 * reciente gana) y, si todo empata, gana el remoto.
 */
function remoteWins(local: FavoriteShow, remote: RemoteFavorite): boolean {
  if (remote.updatedAt !== local.updatedAt) {
    return remote.updatedAt > local.updatedAt;
  }

  const localDeletedAt = local.deletedAt ?? '';
  const remoteDeletedAt = remote.deletedAt ?? '';

  if (remoteDeletedAt !== localDeletedAt) {
    return remoteDeletedAt > localDeletedAt;
  }

  return true;
}

/**
 * Fusiona favoritos locales y remotos con last-write-wins por `updatedAt`.
 * Los elementos solo locales se conservan (aún pueden estar pendientes de push);
 * los remotos ganan si son más recientes o si empatan (determinista).
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

    if (localFavorite === undefined || remoteWins(localFavorite, remoteFavorite)) {
      merged.set(remoteFavorite.showId, favoriteFromRemote(remoteFavorite));
    }
  }

  return [...merged.values()].sort((a, b) => a.showId - b.showId);
}
