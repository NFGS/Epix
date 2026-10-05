import type { SyncStatus } from './sync-status';

export type HistoryEntryType = 'view' | 'search' | 'schedule_open';

/** Fila del historial de uso local (vistas y búsquedas). */
export interface HistoryEntry {
  id?: number;
  showId?: number;
  showName?: string;
  type: HistoryEntryType;
  query?: string;
  resultCount?: number;
  occurredAt: string;
  timezone?: string;
  syncStatus: SyncStatus;
}

/** Atajo de búsqueda reciente para la UI. */
export interface SearchHistoryEntry {
  id?: number;
  query: string;
  resultCount: number;
  occurredAt: string;
}
