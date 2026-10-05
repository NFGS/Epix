import { describe, expect, it } from 'vitest';

import type { FavoriteShow } from '@/domain/entities/favorite';
import type { FavoritesRepository } from '@/domain/ports/favorites-repository';
import type {
  NewOutboxOperation,
  OutboxOperation,
  OutboxRepository,
} from '@/domain/ports/outbox-repository';
import type { Show } from '@/domain/entities/show';

import { toggleFavorite } from './toggle-favorite';

const NOW = '2026-10-05T12:00:00.000Z';

const dark: Show = {
  id: 7,
  name: 'Dark',
  genres: ['Misterio'],
  year: 2017,
  rating: 8.7,
  imageUrl: 'https://static.tvmaze.com/dark.jpg',
};

function createFakeRepositories() {
  const store = new Map<number, FavoriteShow>();
  const enqueued: NewOutboxOperation[] = [];

  const favorites: FavoritesRepository = {
    list: async () =>
      [...store.values()].filter((favorite) => favorite.deletedAt === undefined),
    listIds: async () =>
      [...store.values()]
        .filter((favorite) => favorite.deletedAt === undefined)
        .map((favorite) => favorite.showId),
    get: async (showId) => {
      const favorite = store.get(showId);
      return favorite === undefined || favorite.deletedAt !== undefined ? null : favorite;
    },
    add: async (favorite) => {
      store.set(favorite.showId, favorite);
    },
    remove: async (showId, deletedAt) => {
      const favorite = store.get(showId);
      if (favorite !== undefined) {
        store.set(showId, { ...favorite, deletedAt, updatedAt: deletedAt });
      }
    },
  };

  const outbox: OutboxRepository = {
    enqueue: async (operation) => {
      enqueued.push(operation);
      return {
        ...operation,
        opId: operation.opId ?? 'generated',
        attempts: 0,
        status: 'pending',
      } as OutboxOperation;
    },
    listPending: async () => [],
    markSent: async () => undefined,
    markFailed: async () => undefined,
    purgeByEntity: async () => undefined,
  };

  return { favorites, outbox, enqueued, store };
}

describe('toggleFavorite', () => {
  it('agrega el favorito local y encola el upsert', async () => {
    const { favorites, outbox, enqueued, store } = createFakeRepositories();

    const result = await toggleFavorite(
      { favorites, outbox, now: () => NOW, uuid: () => 'uuid-1' },
      dark,
    );

    expect(result).toBe(true);
    expect(store.get(7)).toMatchObject({
      showId: 7,
      name: 'Dark',
      premiered: 2017,
      imageMedium: 'https://static.tvmaze.com/dark.jpg',
      syncStatus: 'pending',
      addedAt: NOW,
    });
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0]).toMatchObject({
      entity: 'favorite',
      operation: 'upsert',
      entityId: 7,
      opId: 'uuid-1',
      createdAt: NOW,
    });
  });

  it('quita el favorito con tombstone y encola el delete', async () => {
    const { favorites, outbox, enqueued, store } = createFakeRepositories();
    const deps = { favorites, outbox, now: () => NOW, uuid: () => 'uuid-1' };

    await toggleFavorite(deps, dark);
    const result = await toggleFavorite({ ...deps, uuid: () => 'uuid-2' }, dark);

    expect(result).toBe(false);
    expect(store.get(7)?.deletedAt).toBe(NOW);
    expect(enqueued.map((operation) => operation.operation)).toEqual(['upsert', 'delete']);
    expect(enqueued[1]).toMatchObject({ entity: 'favorite', entityId: 7, opId: 'uuid-2' });
  });
});
