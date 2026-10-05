import type { HistoryEntry, SearchHistoryEntry } from '@/domain/entities/history-entry';
import type { HistoryRepository } from '@/domain/ports/history-repository';

import type { EpixDatabase } from './db';

function withoutId(entry: HistoryEntry): HistoryEntry {
  const record: HistoryEntry = { ...entry };
  delete record.id;
  return record;
}

export function createHistoryRepository(db: EpixDatabase): HistoryRepository {
  return {
    async addView(entry: HistoryEntry): Promise<void> {
      await db.history.add(withoutId(entry));
    },

    async addSearch(entry: HistoryEntry): Promise<void> {
      await db.history.add(withoutId(entry));

      if (entry.query !== undefined) {
        await db.searchHistory.add({
          query: entry.query,
          resultCount: entry.resultCount ?? 0,
          occurredAt: entry.occurredAt,
        });
      }
    },

    async list(): Promise<HistoryEntry[]> {
      return db.history.orderBy('occurredAt').reverse().toArray();
    },

    async listSearches(): Promise<SearchHistoryEntry[]> {
      return db.searchHistory.orderBy('occurredAt').reverse().toArray();
    },

    async clear(): Promise<void> {
      await db.transaction('rw', db.history, db.searchHistory, async () => {
        await db.history.clear();
        await db.searchHistory.clear();
      });
    },
  };
}
