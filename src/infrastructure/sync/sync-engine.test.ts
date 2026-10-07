import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SyncAdapter } from '@/application/ports/sync-adapter';
import type { FavoriteShow } from '@/domain/entities/favorite';
import type { UsageEvent } from '@/domain/entities/usage-event';
import { createEpixDatabase, type EpixDatabase } from '@/infrastructure/local/db';
import { createFavoritesRepository } from '@/infrastructure/local/favorites.repository';
import { createHistoryRepository } from '@/infrastructure/local/history.repository';
import { createOutboxRepository } from '@/infrastructure/local/outbox.repository';
import { createSyncMetaRepository } from '@/infrastructure/local/sync-meta.repository';

import { createSyncEngine, type SyncEngineEvent, type SyncEngineStatus } from './sync-engine';

const NOW = '2026-10-05T12:00:00.000Z';
const T1 = '2026-10-05T10:00:00.000Z';
const T2 = '2026-10-05T11:00:00.000Z';

const databases: EpixDatabase[] = [];

function createFavorite(overrides: Partial<FavoriteShow> = {}): FavoriteShow {
  return {
    showId: 5,
    name: 'Vieja',
    genres: ['Drama'],
    addedAt: T1,
    updatedAt: T1,
    syncStatus: 'pending',
    ...overrides,
  };
}

function createFakeAdapter(overrides: Partial<SyncAdapter> = {}): SyncAdapter {
  return {
    ensureSession: vi.fn(async () => 'user-1'),
    pullFavorites: vi.fn(async () => []),
    upsertFavorites: vi.fn(async () => undefined),
    deleteFavorites: vi.fn(async () => undefined),
    pushHistory: vi.fn(async () => undefined),
    clearRemoteHistory: vi.fn(async () => undefined),
    pushEvents: vi.fn(async () => undefined),
    clearRemoteEvents: vi.fn(async () => undefined),
    ...overrides,
  };
}

function createHarness(
  adapter: SyncAdapter | null,
  onSyncEvent?: (event: SyncEngineEvent, payload?: Record<string, unknown>) => void,
  isPaused?: () => boolean,
) {
  const db = createEpixDatabase(`epix-sync-${crypto.randomUUID()}`);
  databases.push(db);

  const outbox = createOutboxRepository(db);
  const repoFavorites = createFavoritesRepository(db);
  const repoHistory = createHistoryRepository(db);
  const meta = createSyncMetaRepository(db);
  const engine = createSyncEngine({
    outbox,
    repoFavorites,
    repoHistory,
    meta,
    adapter,
    now: () => NOW,
    ...(onSyncEvent === undefined ? {} : { onSyncEvent }),
    ...(isPaused === undefined ? {} : { isPaused }),
  });

  return { db, outbox, repoFavorites, repoHistory, meta, engine };
}

function createUsageEvent(overrides: Partial<UsageEvent> = {}): UsageEvent {
  return {
    id: 'event-1',
    eventType: 'session_start',
    occurredAt: T1,
    timezone: 'America/Bogota',
    appVersion: '0.1.0',
    ...overrides,
  };
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(databases.splice(0).map(async (db) => db.delete()));
});

describe('sync engine', () => {
  it('queda en local-only cuando no hay adapter', async () => {
    const { engine } = createHarness(null);
    const statuses: SyncEngineStatus[] = [];
    engine.subscribe(() => {
      statuses.push(engine.getStatus());
    });

    await engine.syncNow();

    expect(engine.getStatus().state).toBe('local-only');
    expect(statuses.at(-1)?.state).toBe('local-only');
  });

  it('empuja las operaciones pendientes, las marca enviadas y sube cursores', async () => {
    const adapter = createFakeAdapter();
    const harness = createHarness(adapter);
    const favorite = createFavorite();

    await harness.repoFavorites.add(favorite);
    await harness.outbox.enqueue({
      entity: 'favorite',
      operation: 'upsert',
      entityId: 5,
      payload: favorite,
      createdAt: T1,
    });

    await harness.engine.syncNow();

    expect(adapter.upsertFavorites).toHaveBeenCalledTimes(1);
    expect(await harness.outbox.listPending()).toEqual([]);
    expect(harness.engine.getStatus().state).toBe('idle');
    expect(await harness.meta.get('userId')).toBe('user-1');
    expect(await harness.meta.get('lastSyncAt')).toBe(NOW);
  });

  it('ante un fallo conserva la operación pendiente con intentos y aborta el orden', async () => {
    const adapter = createFakeAdapter({
      upsertFavorites: vi.fn(async () => {
        throw new Error('sin red');
      }),
    });
    const harness = createHarness(adapter);
    const favorite = createFavorite();

    await harness.repoFavorites.add(favorite);
    await harness.outbox.enqueue({
      entity: 'favorite',
      operation: 'upsert',
      entityId: 5,
      payload: favorite,
      createdAt: T1,
    });
    await harness.outbox.enqueue({
      entity: 'favorite',
      operation: 'delete',
      entityId: 5,
      payload: null,
      createdAt: T2,
    });

    await harness.engine.syncNow();

    const pending = await harness.outbox.listPending();
    expect(pending).toHaveLength(2);
    expect(pending[0]).toMatchObject({ operation: 'upsert', attempts: 1, status: 'pending' });
    expect(pending[1]).toMatchObject({ operation: 'delete', attempts: 0 });
    expect(adapter.deleteFavorites).not.toHaveBeenCalled();
    expect(harness.engine.getStatus().state).toBe('error');
  });

  it('hace pull de favoritos y aplica el merge last-write-wins', async () => {
    const adapter = createFakeAdapter({
      pullFavorites: vi.fn(async () => [
        {
          showId: 5,
          snapshot: { name: 'Nueva', genres: ['Drama'] },
          addedAt: T1,
          updatedAt: T2,
        },
      ]),
    });
    const harness = createHarness(adapter);

    await harness.repoFavorites.add(createFavorite());

    await harness.engine.syncNow();

    expect(await harness.repoFavorites.get(5)).toMatchObject({
      name: 'Nueva',
      syncStatus: 'synced',
    });
    expect(await harness.meta.get('lastPulledAt')).toBe(T2);
    expect(harness.engine.getStatus().state).toBe('idle');
  });

  it('el pull no resucita un favorito quitado localmente (tombstone gana)', async () => {
    const adapter = createFakeAdapter({
      pullFavorites: vi.fn(async () => [
        {
          showId: 5,
          snapshot: { name: 'Vieja', genres: ['Drama'] },
          addedAt: T1,
          updatedAt: T1,
        },
      ]),
    });
    const harness = createHarness(adapter);

    await harness.repoFavorites.add(createFavorite({ updatedAt: T2 }));
    await harness.repoFavorites.remove(5, T2);

    await harness.engine.syncNow();

    expect(await harness.repoFavorites.get(5)).toBeNull();
    const raw = await harness.repoFavorites.listAll();
    expect(raw.find((favorite) => favorite.showId === 5)?.deletedAt).toBe(T2);
  });

  it('no sincroniza si el navegador está sin conexión', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const adapter = createFakeAdapter();
    const harness = createHarness(adapter);

    await harness.engine.syncNow();

    expect(harness.engine.getStatus().state).toBe('offline');
    expect(adapter.ensureSession).not.toHaveBeenCalled();
  });

  it('queda en local-only sin crear sesión anónima tras un cierre explícito', async () => {
    const adapter = createFakeAdapter();
    const harness = createHarness(adapter, undefined, () => true);

    await harness.engine.syncNow();

    expect(harness.engine.getStatus().state).toBe('local-only');
    expect(adapter.ensureSession).not.toHaveBeenCalled();
  });

  it('evita ejecuciones concurrentes reutilizando el mismo promise', async () => {
    const adapter = createFakeAdapter();
    const harness = createHarness(adapter);

    const first = harness.engine.syncNow();
    const second = harness.engine.syncNow();

    expect(second).toBe(first);
    await first;
    expect(adapter.ensureSession).toHaveBeenCalledTimes(1);
  });

  it('empuja los eventos de telemetría al adaptador y los marca enviados', async () => {
    const adapter = createFakeAdapter();
    const harness = createHarness(adapter);
    const event = createUsageEvent({ payload: { path: '/' } });

    await harness.outbox.enqueue({
      entity: 'telemetry',
      operation: 'push',
      entityId: event.id,
      payload: event,
      opId: event.id,
      createdAt: T1,
    });

    await harness.engine.syncNow();

    expect(adapter.pushEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'event-1',
        eventType: 'session_start',
        timezone: 'America/Bogota',
      }),
    ]);
    expect(await harness.outbox.listPending()).toEqual([]);
    expect(harness.engine.getStatus().state).toBe('idle');
  });

  it('borra la telemetría remota con la operación clear', async () => {
    const adapter = createFakeAdapter();
    const harness = createHarness(adapter);

    await harness.outbox.enqueue({
      entity: 'telemetry',
      operation: 'clear',
      entityId: null,
      payload: null,
      createdAt: T1,
    });

    await harness.engine.syncNow();

    expect(adapter.clearRemoteEvents).toHaveBeenCalledTimes(1);
    expect(await harness.outbox.listPending()).toEqual([]);
  });

  it('no reporta sync_success si la corrida solo empujó telemetría (evita bucles)', async () => {
    const adapter = createFakeAdapter();
    const onSyncEvent = vi.fn();
    const harness = createHarness(adapter, onSyncEvent);
    const event = createUsageEvent();

    await harness.outbox.enqueue({
      entity: 'telemetry',
      operation: 'push',
      entityId: event.id,
      payload: event,
      opId: event.id,
      createdAt: T1,
    });

    await harness.engine.syncNow();

    expect(onSyncEvent).not.toHaveBeenCalled();
  });

  it('reporta sync_success cuando la corrida empujó datos funcionales', async () => {
    const adapter = createFakeAdapter();
    const onSyncEvent = vi.fn();
    const harness = createHarness(adapter, onSyncEvent);

    await harness.repoFavorites.add(createFavorite());
    await harness.outbox.enqueue({
      entity: 'favorite',
      operation: 'upsert',
      entityId: 5,
      payload: createFavorite(),
      createdAt: T1,
    });

    await harness.engine.syncNow();

    expect(onSyncEvent).toHaveBeenCalledWith('sync_success', { pushed: 1 });
  });
});
