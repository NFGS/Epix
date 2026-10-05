import type { FavoriteShow } from '@/domain/entities/favorite';

export interface FavoritesRepository {
  /** Favoritos activos, más recientes primero. */
  list(): Promise<FavoriteShow[]>;
  listIds(): Promise<number[]>;
  get(showId: number): Promise<FavoriteShow | null>;
  add(favorite: FavoriteShow): Promise<void>;
  /** Borrado lógico con marca de tiempo para resolver conflictos LWW. */
  remove(showId: number, deletedAt: string): Promise<void>;
}
