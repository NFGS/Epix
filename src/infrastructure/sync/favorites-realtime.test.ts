import { describe, expect, it, vi } from 'vitest';

import type { RemoteFavorite, SyncAdapter } from '@/application/ports/sync-adapter';
import type { FavoriteShow } from '@/domain/entities/favorite';

import { applyRemoteFavorite, startFavoritesRealtime } from './favorites-realtime';

const T1 = '2026-10-05T10:00:00.000Z';
const T2 = '2026-10-05T11:00:00.000Z';

function createFavorite(overrides: Partial<FavoriteShow> = {}): FavoriteShow {
  return {
    showId: 5,
    name: 'Local',
    genres: ['Drama'],
    addedAt: T1,
    updatedAt: T1,
    syncStatus: 'synced',
    ...overrides,
  };
}

function createRemote(overrides: Partial<RemoteFavorite> = {}): RemoteFavorite {
  return {
    showId: 5,
    snapshot: { name: 'Remota', genres: ['Drama'] },
    addedAt: T1,
    updatedAt: T2,
    ...overrides,
  };
}

function createHarness(local?: FavoriteShow) {
  const store = new Map<number, FavoriteShow>();
  if (local !== undefined) {
    store.set(local.showId, local);
  }

  const add = vi.fn(async (favorite: FavoriteShow) => {
    store.set(favorite.showId, favorite);
  });

  return {
    store,
    add,
    deps: {
      repoFavorites: { add },
      getLocalFavorite: async (showId: number) => store.get(showId),
    },
  };
}

describe('applyRemoteFavorite (Realtime + LWW)', () => {
  it('escribe en Dexie cuando el remoto es más reciente', async () => {
    const harness = createHarness(createFavorite());
    const remote = createRemote();

    await applyRemoteFavorite(harness.deps, remote);

    expect(harness.add).toHaveBeenCalledTimes(1);
    expect(harness.store.get(5)).toMatchObject({
      name: 'Remota',
      updatedAt: T2,
      syncStatus: 'synced',
    });
  });

  it('no escribe cuando el local es más reciente', async () => {
    const harness = createHarness(createFavorite({ updatedAt: T2, name: 'Local nueva' }));

    await applyRemoteFavorite(harness.deps, createRemote({ updatedAt: T1 }));

    expect(harness.add).not.toHaveBeenCalled();
    expect(harness.store.get(5)?.name).toBe('Local nueva');
  });

  it('un tombstone local más reciente gana a un upsert remoto viejo', async () => {
    const harness = createHarness(
      createFavorite({ updatedAt: T2, deletedAt: T2, syncStatus: 'pending' }),
    );

    await applyRemoteFavorite(harness.deps, createRemote({ updatedAt: T1 }));

    expect(harness.add).not.toHaveBeenCalled();
    expect(harness.store.get(5)?.deletedAt).toBe(T2);
  });

  it('un upsert remoto más reciente resucita sobre un tombstone local viejo', async () => {
    const harness = createHarness(
      createFavorite({ updatedAt: T1, deletedAt: T1, syncStatus: 'pending' }),
    );

    await applyRemoteFavorite(harness.deps, createRemote({ updatedAt: T2 }));

    expect(harness.add).toHaveBeenCalledTimes(1);
    expect(harness.store.get(5)?.deletedAt).toBeUndefined();
  });

  it('inserta el favorito si no existe localmente', async () => {
    const harness = createHarness();

    await applyRemoteFavorite(harness.deps, createRemote());

    expect(harness.add).toHaveBeenCalledTimes(1);
    expect(harness.store.get(5)?.name).toBe('Remota');
  });
});

describe('startFavoritesRealtime', () => {
  function createRealtimeAdapter(overrides: Partial<SyncAdapter> = {}) {
    let onRow: ((favorite: RemoteFavorite) => void) | null = null;
    const unsubscribe = vi.fn();

    const adapter = {
      ensureSession: vi.fn(async () => 'user-1'),
      pullFavorites: vi.fn(async () => []),
      upsertFavorites: vi.fn(async () => undefined),
      deleteFavorites: vi.fn(async () => undefined),
      pushHistory: vi.fn(async () => undefined),
      clearRemoteHistory: vi.fn(async () => undefined),
      pushEvents: vi.fn(async () => undefined),
      clearRemoteEvents: vi.fn(async () => undefined),
      subscribeFavorites: vi.fn((_userId: string, handler: (favorite: RemoteFavorite) => void) => {
        onRow = handler;
        return unsubscribe;
      }),
      ...overrides,
    } satisfies SyncAdapter;

    return { adapter, unsubscribe, emit: (favorite: RemoteFavorite) => onRow?.(favorite) };
  }

  it('suscribe por usuario y aplica los eventos a Dexie', async () => {
    const { adapter, emit } = createRealtimeAdapter();
    const harness = createHarness();

    startFavoritesRealtime({
      adapter,
      userId: 'user-1',
      repoFavorites: harness.deps.repoFavorites,
      getLocalFavorite: harness.deps.getLocalFavorite,
    });

    expect(adapter.subscribeFavorites).toHaveBeenCalledWith('user-1', expect.any(Function));

    emit(createRemote());
    await vi.waitFor(() => {
      expect(harness.store.get(5)?.name).toBe('Remota');
    });
  });

  it('devuelve el unsubscribe del adaptador', () => {
    const { adapter, unsubscribe } = createRealtimeAdapter();
    const harness = createHarness();

    const dispose = startFavoritesRealtime({
      adapter,
      userId: 'user-1',
      repoFavorites: harness.deps.repoFavorites,
      getLocalFavorite: harness.deps.getLocalFavorite,
    });

    dispose();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('sin soporte de Realtime es un no-op', () => {
    const { adapter } = createRealtimeAdapter({ subscribeFavorites: undefined });
    const harness = createHarness();

    const dispose = startFavoritesRealtime({
      adapter,
      userId: 'user-1',
      repoFavorites: harness.deps.repoFavorites,
      getLocalFavorite: harness.deps.getLocalFavorite,
    });

    expect(() => dispose()).not.toThrow();
  });

  it('reporta errores de escritura sin romper la suscripción', async () => {
    const { adapter, emit } = createRealtimeAdapter();
    const onError = vi.fn();
    const harness = createHarness();

    startFavoritesRealtime({
      adapter,
      userId: 'user-1',
      repoFavorites: {
        add: async () => {
          throw new Error('IndexedDB bloqueada');
        },
      },
      getLocalFavorite: harness.deps.getLocalFavorite,
      onError,
    });

    emit(createRemote());
    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });
});
