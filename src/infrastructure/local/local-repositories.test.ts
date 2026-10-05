import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { FavoriteShow } from '@/domain/entities/favorite';
import type { HistoryEntry } from '@/domain/entities/history-entry';
import type { UsageEvent } from '@/domain/entities/usage-event';

import { createEpixDatabase, type EpixDatabase } from './db';
import { createFavoritesRepository } from './favorites.repository';
import { createHistoryRepository } from './history.repository';
import { createNotifiedRepository } from './notified.repository';
import { createOutboxRepository } from './outbox.repository';
import { createSyncMetaRepository } from './sync-meta.repository';

const T1 = '2026-10-05T10:00:00.000Z';
const T2 = '2026-10-05T11:00:00.000Z';

function createFavorite(overrides: Partial<FavoriteShow> = {}): FavoriteShow {
  return {
    showId: 1,
    name: 'Girls',
    genres: ['Drama'],
    addedAt: T1,
    updatedAt: T1,
    syncStatus: 'pending',
    ...overrides,
  };
}

describe('repositorios locales (Dexie)', () => {
  let db: EpixDatabase;

  beforeEach(() => {
    db = createEpixDatabase(`epix-test-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    await db.delete();
  });

  it('guarda, lista y elimina favoritos con tombstone', async () => {
    const favorites = createFavoritesRepository(db);

    await favorites.add(createFavorite());
    expect(await favorites.list()).toHaveLength(1);
    expect(await favorites.listIds()).toEqual([1]);
    expect(await favorites.get(1)).toMatchObject({ name: 'Girls', syncStatus: 'pending' });

    await favorites.remove(1, T2);

    expect(await favorites.get(1)).toBeNull();
    expect(await favorites.list()).toEqual([]);
    expect(await favorites.listIds()).toEqual([]);
    const tombstone = await db.favorites.get(1);
    expect(tombstone?.deletedAt).toBe(T2);
    expect(tombstone?.updatedAt).toBe(T2);
  });

  it('ordena los favoritos por fecha de alta descendente', async () => {
    const favorites = createFavoritesRepository(db);

    await favorites.add(createFavorite({ showId: 1, name: 'Antigua', addedAt: T1 }));
    await favorites.add(createFavorite({ showId: 2, name: 'Nueva', addedAt: T2 }));

    expect((await favorites.list()).map((favorite) => favorite.name)).toEqual(['Nueva', 'Antigua']);
  });

  it('registra vistas y búsquedas, y las vacía juntas', async () => {
    const history = createHistoryRepository(db);

    await history.addView({
      type: 'view',
      showId: 1,
      showName: 'Girls',
      occurredAt: T1,
      timezone: 'America/Bogota',
      syncStatus: 'pending',
    });
    await history.addSearch({
      type: 'search',
      query: 'girls',
      resultCount: 3,
      occurredAt: T2,
      syncStatus: 'pending',
    });

    const entries = await history.list();
    expect(entries.map((entry) => entry.type)).toEqual(['search', 'view']);

    const searches = await history.listSearches();
    expect(searches).toHaveLength(1);
    expect(searches[0]).toMatchObject({ query: 'girls', resultCount: 3 });

    await history.clear();
    expect(await history.list()).toEqual([]);
    expect(await history.listSearches()).toEqual([]);
  });

  it('encola operaciones con opId propio y las marca enviadas', async () => {
    const outbox = createOutboxRepository(db);

    const operation = await outbox.enqueue({
      entity: 'favorite',
      operation: 'upsert',
      entityId: 1,
      payload: createFavorite(),
      createdAt: T1,
    });

    expect(operation.opId).toMatch(/^[0-9a-f-]{36}$/);
    expect(operation.status).toBe('pending');
    expect(operation.attempts).toBe(0);

    const pending = await outbox.listPending();
    expect(pending).toHaveLength(1);

    if (operation.id === undefined) {
      throw new Error('La operación debía tener id.');
    }

    await outbox.markSent(operation.id);
    expect(await outbox.listPending()).toEqual([]);
    expect((await db.outbox.get(operation.id))?.status).toBe('sent');
  });

  it('respetando el orden de encolado', async () => {
    const outbox = createOutboxRepository(db);

    await outbox.enqueue({
      entity: 'favorite',
      operation: 'upsert',
      entityId: 1,
      payload: createFavorite(),
      createdAt: T1,
    });
    await outbox.enqueue({
      entity: 'favorite',
      operation: 'delete',
      entityId: 1,
      payload: null,
      createdAt: T2,
    });

    const pending = await outbox.listPending();
    expect(pending.map((operation) => operation.operation)).toEqual(['upsert', 'delete']);
  });

  it('purga por entidad las operaciones pendientes y enviadas (R-01)', async () => {
    const outbox = createOutboxRepository(db);
    const historyEntry: HistoryEntry = {
      type: 'view',
      showId: 1,
      showName: 'Girls',
      occurredAt: T1,
      syncStatus: 'pending',
    };
    const usageEvent: UsageEvent = {
      id: 'event-1',
      eventType: 'session_start',
      occurredAt: T1,
      timezone: 'America/Bogota',
      appVersion: '0.1.0',
    };

    const sent = await outbox.enqueue({
      entity: 'history',
      operation: 'push',
      entityId: 'op-1',
      payload: historyEntry,
      createdAt: T1,
    });
    await outbox.enqueue({
      entity: 'history',
      operation: 'clear',
      entityId: null,
      payload: null,
      createdAt: T2,
    });
    await outbox.enqueue({
      entity: 'telemetry',
      operation: 'push',
      entityId: usageEvent.id,
      payload: usageEvent,
      createdAt: T2,
    });

    if (sent.id === undefined) {
      throw new Error('La operación debía tener id.');
    }
    await outbox.markSent(sent.id);

    await outbox.purgeByEntity('history');

    const remaining = await db.outbox.toArray();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.entity).toBe('telemetry');
  });

  it('incrementa intentos al fallar y termina en failed tras el máximo', async () => {
    const outbox = createOutboxRepository(db);
    const operation = await outbox.enqueue({
      entity: 'history',
      operation: 'clear',
      entityId: null,
      payload: null,
      createdAt: T1,
    });

    if (operation.id === undefined) {
      throw new Error('La operación debía tener id.');
    }

    await outbox.markFailed(operation.id);

    const [pending] = await outbox.listPending();
    expect(pending.attempts).toBe(1);
    expect(pending.status).toBe('pending');
    expect(pending.lastAttemptAt).toBeDefined();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await outbox.markFailed(operation.id);
    }

    expect(await outbox.listPending()).toEqual([]);
    expect((await db.outbox.get(operation.id))?.status).toBe('failed');
  });

  it('registra y consulta recordatorios notificados por clave', async () => {
    const notified = createNotifiedRepository(db);

    expect(await notified.isNotified('1:5')).toBe(false);

    await notified.markNotified({ key: '1:5', showId: 1, episodeId: 5, notifiedAt: T1 });

    expect(await notified.isNotified('1:5')).toBe(true);
    expect(await notified.isNotified('1:6')).toBe(false);
    expect(await db.notified.get('1:5')).toMatchObject({ showId: 1, episodeId: 5 });
  });

  it('persiste cursores y usuario en syncMeta', async () => {
    const meta = createSyncMetaRepository(db);

    expect(await meta.get('lastPulledAt')).toBeNull();

    await meta.set('lastPulledAt', T1);
    await meta.set('userId', 'user-1');

    expect(await meta.get('lastPulledAt')).toBe(T1);
    expect(await meta.get('userId')).toBe('user-1');
  });
});
