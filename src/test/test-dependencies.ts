import { createEpixDatabase } from '@/infrastructure/local/db';
import { createFavoritesRepository } from '@/infrastructure/local/favorites.repository';
import { createHistoryRepository } from '@/infrastructure/local/history.repository';
import { createOutboxRepository } from '@/infrastructure/local/outbox.repository';
import { createPreferencesRepository } from '@/infrastructure/local/preferences.repository';
import { createSyncMetaRepository } from '@/infrastructure/local/sync-meta.repository';
import { createSyncEngine } from '@/infrastructure/sync/sync-engine';
import type { Dependencies } from '@/presentation/hooks/dependencies-context';

let databaseCounter = 0;

export type TestDependencies = Dependencies;

/** Dependencias reales (Dexie sobre fake-indexeddb) con adapter local-only. */
export function createTestDependencies(overrides: Partial<Dependencies> = {}): TestDependencies {
  databaseCounter += 1;
  const db = createEpixDatabase(`epix-test-${databaseCounter}-${crypto.randomUUID()}`);
  const favorites = createFavoritesRepository(db);
  const history = createHistoryRepository(db);
  const outbox = createOutboxRepository(db);
  const preferences = createPreferencesRepository(db);
  const syncMeta = createSyncMetaRepository(db);
  const adapter = null;
  const engine = createSyncEngine({
    outbox,
    repoFavorites: favorites,
    repoHistory: history,
    meta: syncMeta,
    adapter,
  });

  return { db, favorites, history, outbox, preferences, syncMeta, adapter, engine, ...overrides };
}
