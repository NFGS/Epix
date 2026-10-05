import type { FavoriteSnapshot } from '@/domain/entities/favorite';
import type { HistoryEntryType } from '@/domain/entities/history-entry';

/** Favorito tal como viaja entre la nube y el dispositivo. */
export interface RemoteFavorite {
  showId: number;
  snapshot: FavoriteSnapshot;
  addedAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/** Evento de historial listo para `watch_history` (id UUID generado en el cliente). */
export interface RemoteHistoryEntry {
  id: string;
  showId?: number;
  eventType: HistoryEntryType;
  query?: string;
  occurredAt: string;
  timezone?: string;
}

export interface SyncAdapter {
  /** Inicia sesión anónima si hace falta y devuelve el `user_id`. */
  ensureSession(): Promise<string>;
  pullFavorites(sinceIso: string): Promise<RemoteFavorite[]>;
  upsertFavorites(favorites: RemoteFavorite[]): Promise<void>;
  /** Borrado lógico remoto (tombstones con `deleted_at`). */
  deleteFavorites(showIds: number[]): Promise<void>;
  pushHistory(entries: RemoteHistoryEntry[]): Promise<void>;
  clearRemoteHistory(): Promise<void>;
}
