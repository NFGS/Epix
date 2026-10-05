import type { Show } from './show';
import type { SyncStatus } from './sync-status';

/** Copia parcial de una serie guardada como favorita (offline-first). */
export interface FavoriteShow {
  showId: number;
  name: string;
  imageMedium?: string;
  premiered?: number;
  genres: string[];
  rating?: number;
  addedAt: string;
  updatedAt: string;
  /** Marca de borrado lógico: la fila se conserva para resolver conflictos. */
  deletedAt?: string;
  syncStatus: SyncStatus;
}

/** Datos mínimos de la serie que viajan a la nube (columna `snapshot`). */
export type FavoriteSnapshot = Omit<
  FavoriteShow,
  'showId' | 'addedAt' | 'updatedAt' | 'deletedAt' | 'syncStatus'
>;

/** Construye el favorito local a partir de la serie de TVmaze. */
export function favoriteFromShow(show: Show, now: string): FavoriteShow {
  return {
    showId: show.id,
    name: show.name,
    genres: [...show.genres],
    imageMedium: show.imageUrl,
    premiered: show.year,
    rating: show.rating,
    addedAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  };
}

/** Extrae el snapshot enviable a Supabase. */
export function favoriteSnapshot(favorite: FavoriteShow): FavoriteSnapshot {
  return {
    name: favorite.name,
    genres: [...favorite.genres],
    imageMedium: favorite.imageMedium,
    premiered: favorite.premiered,
    rating: favorite.rating,
  };
}
