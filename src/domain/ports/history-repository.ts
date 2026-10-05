import type { HistoryEntry, SearchHistoryEntry } from '@/domain/entities/history-entry';

export interface HistoryRepository {
  addView(entry: HistoryEntry): Promise<void>;
  /** Guarda la fila de historial y el atajo de búsqueda reciente. */
  addSearch(entry: HistoryEntry): Promise<void>;
  list(): Promise<HistoryEntry[]>;
  listSearches(): Promise<SearchHistoryEntry[]>;
  clear(): Promise<void>;
}
