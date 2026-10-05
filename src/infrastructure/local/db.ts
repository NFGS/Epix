import Dexie, { type Table } from 'dexie';

import type { FavoriteShow } from '@/domain/entities/favorite';
import type { HistoryEntry, SearchHistoryEntry } from '@/domain/entities/history-entry';
import type { UserPreferences } from '@/domain/entities/preferences';
import type { SyncStatus } from '@/domain/entities/sync-status';
import type { OutboxOperation } from '@/domain/ports/outbox-repository';

/** Preferencias únicas del dispositivo (fila `key: 'app'`). */
export interface PreferenceRecord extends UserPreferences {
  key: 'app';
  syncStatus: SyncStatus;
}

export interface SyncMetaRecord {
  key: string;
  value: string;
}

/**
 * Base de datos local de Epix (IndexedDB vía Dexie).
 * Esquema alineado con `docs/modelo-datos.md` §1.
 */
export class EpixDatabase extends Dexie {
  preferences!: Table<PreferenceRecord, string>;
  favorites!: Table<FavoriteShow, number>;
  history!: Table<HistoryEntry, number>;
  searchHistory!: Table<SearchHistoryEntry, number>;
  outbox!: Table<OutboxOperation, number>;
  syncMeta!: Table<SyncMetaRecord, string>;

  constructor(name = 'epix') {
    super(name);
    this.version(1).stores({
      preferences: 'key',
      favorites: 'showId, addedAt, syncStatus',
      history: '++id, showId, type, occurredAt, syncStatus',
      searchHistory: '++id, query, occurredAt',
      outbox: '++id, opId, entity, status, createdAt',
      syncMeta: 'key',
    });
  }
}

export function createEpixDatabase(name?: string): EpixDatabase {
  return new EpixDatabase(name);
}
