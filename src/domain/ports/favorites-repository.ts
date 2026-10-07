import type { FavoriteShow } from '@/domain/entities/favorite';

export interface FavoritesRepository {
  /** Favoritos activos, más recientes primero. */
  list(): Promise<FavoriteShow[]>;
  /**
   * Todos los registros, **incluidos los tombstones** (`deletedAt`).
   * El merge LWW del pull lo necesita: sin los borrados locales, un remoto
   * activo más viejo podría resucitar un favorito recién quitado.
   */
  listAll(): Promise<FavoriteShow[]>;
  listIds(): Promise<number[]>;
  get(showId: number): Promise<FavoriteShow | null>;
  add(favorite: FavoriteShow): Promise<void>;
  /** Borrado lógico con marca de tiempo para resolver conflictos LWW. */
  remove(showId: number, deletedAt: string): Promise<void>;
  /** Vaciado total local (uso: cierre de sesión en dispositivos compartidos). */
  clear(): Promise<void>;
}
