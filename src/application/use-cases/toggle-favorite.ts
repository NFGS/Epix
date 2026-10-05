import { favoriteFromShow, type FavoriteShow } from '@/domain/entities/favorite';
import type { Show } from '@/domain/entities/show';
import type { FavoritesRepository } from '@/domain/ports/favorites-repository';
import type { OutboxRepository } from '@/domain/ports/outbox-repository';

export interface ToggleFavoriteDeps {
  favorites: FavoritesRepository;
  outbox: OutboxRepository;
  now: () => string;
  uuid: () => string;
}

/**
 * Alterna el favorito de una serie: primero local (IndexedDB) y luego encola la
 * operación en el outbox. Devuelve `true` si la serie queda como favorita.
 */
export async function toggleFavorite(deps: ToggleFavoriteDeps, show: Show): Promise<boolean> {
  const timestamp = deps.now();
  const existing = await deps.favorites.get(show.id);

  if (existing !== null) {
    await deps.favorites.remove(show.id, timestamp);
    await deps.outbox.enqueue({
      entity: 'favorite',
      operation: 'delete',
      entityId: show.id,
      payload: null,
      opId: deps.uuid(),
      createdAt: timestamp,
    });
    return false;
  }

  const favorite: FavoriteShow = favoriteFromShow(show, timestamp);
  await deps.favorites.add(favorite);
  await deps.outbox.enqueue({
    entity: 'favorite',
    operation: 'upsert',
    entityId: show.id,
    payload: favorite,
    opId: deps.uuid(),
    createdAt: timestamp,
  });
  return true;
}
