import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

import { createEpixDatabase, type EpixDatabase } from './db';

const T1 = '2026-10-05T10:00:00.000Z';

/** Réplica del esquema v1 (Incremento 3) para probar la migración real de Dexie. */
function createLegacyV1Database(name: string): Dexie {
  const legacy = new Dexie(name);
  legacy.version(1).stores({
    preferences: 'key',
    favorites: 'showId, addedAt, syncStatus',
    history: '++id, showId, type, occurredAt, syncStatus',
    searchHistory: '++id, query, occurredAt',
    outbox: '++id, opId, entity, status, createdAt',
    syncMeta: 'key',
  });
  return legacy;
}

describe('EpixDatabase · migración v1 → v2', () => {
  let db: EpixDatabase | null = null;

  afterEach(async () => {
    if (db !== null) {
      await db.delete();
      db = null;
    }
  });

  it('conserva favoritos y preferencias y agrega la tabla notified', async () => {
    const name = `epix-migration-${crypto.randomUUID()}`;

    const legacy = createLegacyV1Database(name);
    await legacy.open();
    await legacy.table('favorites').put({
      showId: 1,
      name: 'Girls',
      genres: ['Drama'],
      addedAt: T1,
      updatedAt: T1,
      syncStatus: 'pending',
    });
    await legacy.table('preferences').put({
      key: 'app',
      theme: 'dark',
      language: 'es',
      favoriteGenres: [],
      maxAgeRating: 'TV-14',
      country: null,
      countrySource: null,
      notificationsEnabled: false,
      telemetryEnabled: false,
      updatedAt: T1,
      syncStatus: 'pending',
    });
    legacy.close();

    db = createEpixDatabase(name);
    await db.open();

    expect(await db.favorites.get(1)).toMatchObject({ name: 'Girls', syncStatus: 'pending' });
    expect((await db.preferences.get('app'))?.theme).toBe('dark');

    await db.notified.put({ key: '1:5', showId: 1, episodeId: 5, notifiedAt: T1 });
    expect(await db.notified.get('1:5')).toMatchObject({ showId: 1, episodeId: 5 });
  });
});
