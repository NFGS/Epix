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

/** Réplica del esquema v2 (Incremento 6) para probar la migración a v3. */
function createLegacyV2Database(name: string): Dexie {
  const legacy = createLegacyV1Database(name);
  legacy.version(2).stores({
    notified: 'key, showId, episodeId, notifiedAt',
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

  it('agrega usageEvents en v3 sin perder las tablas de v1/v2', async () => {
    const name = `epix-migration-v3-${crypto.randomUUID()}`;

    const legacy = createLegacyV2Database(name);
    await legacy.open();
    await legacy.table('favorites').put({
      showId: 9,
      name: 'Severance',
      genres: ['Drama'],
      addedAt: T1,
      updatedAt: T1,
      syncStatus: 'pending',
    });
    await legacy.table('notified').put({ key: '9:12', showId: 9, episodeId: 12, notifiedAt: T1 });
    legacy.close();

    db = createEpixDatabase(name);
    await db.open();

    expect((await db.favorites.get(9))?.name).toBe('Severance');
    expect(await db.notified.get('9:12')).toMatchObject({ episodeId: 12 });

    await db.usageEvents.put({
      id: 'event-1',
      eventType: 'session_start',
      occurredAt: T1,
      timezone: 'America/Bogota',
      appVersion: '0.1.0',
    });
    expect(await db.usageEvents.get('event-1')).toMatchObject({ eventType: 'session_start' });
  });
});
