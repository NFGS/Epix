import type { FavoriteShow } from '@/domain/entities/favorite';
import type { FavoritesRepository } from '@/domain/ports/favorites-repository';

import type { EpixDatabase } from './db';

export function createFavoritesRepository(db: EpixDatabase): FavoritesRepository {
  return {
    async list(): Promise<FavoriteShow[]> {
      const favorites = await db.favorites.orderBy('addedAt').reverse().toArray();
      return favorites.filter((favorite) => favorite.deletedAt === undefined);
    },

    async listIds(): Promise<number[]> {
      const favorites = await db.favorites.toArray();
      return favorites
        .filter((favorite) => favorite.deletedAt === undefined)
        .map((favorite) => favorite.showId);
    },

    async get(showId: number): Promise<FavoriteShow | null> {
      const favorite = await db.favorites.get(showId);
      if (favorite === undefined || favorite.deletedAt !== undefined) {
        return null;
      }
      return favorite;
    },

    async add(favorite: FavoriteShow): Promise<void> {
      await db.favorites.put(favorite);
    },

    async remove(showId: number, deletedAt: string): Promise<void> {
      const favorite = await db.favorites.get(showId);
      if (favorite === undefined) {
        return;
      }
      await db.favorites.put({ ...favorite, deletedAt, updatedAt: deletedAt });
    },
  };
}
