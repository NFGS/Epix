import type { RemoteFavorite, RemoteHistoryEntry, SyncAdapter } from '@/application/ports/sync-adapter';
import { favoriteSnapshot, type FavoriteShow } from '@/domain/entities/favorite';
import type { FavoritesRepository } from '@/domain/ports/favorites-repository';
import type { HistoryRepository } from '@/domain/ports/history-repository';
import type { OutboxOperation, OutboxRepository } from '@/domain/ports/outbox-repository';
import type { SyncMetaRepository } from '@/domain/ports/sync-meta-repository';

import { mergeFavorites } from './merge-favorites';

export type SyncEngineState = 'local-only' | 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncEngineStatus {
  state: SyncEngineState;
  lastSyncedAt?: string;
  lastError?: string;
}

export interface SyncEngine {
  getStatus(): SyncEngineStatus;
  subscribe(listener: () => void): () => void;
  syncNow(): Promise<void>;
}

export interface SyncEngineDeps {
  outbox: OutboxRepository;
  repoFavorites: FavoritesRepository;
  repoHistory: HistoryRepository;
  meta: SyncMetaRepository;
  adapter: SyncAdapter | null;
  now?: () => string;
}

const EPOCH_ISO = new Date(0).toISOString();

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error de sincronización desconocido.';
}

function favoriteToRemote(favorite: FavoriteShow): RemoteFavorite {
  return {
    showId: favorite.showId,
    snapshot: favoriteSnapshot(favorite),
    addedAt: favorite.addedAt,
    updatedAt: favorite.updatedAt,
    deletedAt: favorite.deletedAt,
  };
}

function historyToRemote(operation: OutboxOperation): RemoteHistoryEntry {
  if (operation.entity !== 'history' || operation.operation !== 'push') {
    throw new Error('La operación no es un push de historial.');
  }

  return {
    id: operation.opId,
    showId: operation.payload.showId,
    eventType: operation.payload.type,
    query: operation.payload.query,
    occurredAt: operation.payload.occurredAt,
    timezone: operation.payload.timezone,
  };
}

export function createSyncEngine(deps: SyncEngineDeps): SyncEngine {
  const clock = deps.now ?? (() => new Date().toISOString());
  const listeners = new Set<() => void>();
  let status: SyncEngineStatus =
    deps.adapter === null ? { state: 'local-only' } : { state: 'idle' };
  let inFlight: Promise<void> | null = null;

  function setStatus(next: SyncEngineStatus): void {
    status = next;
    for (const listener of listeners) {
      listener();
    }
  }

  function isOnline(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine;
  }

  async function applyOperation(adapter: SyncAdapter, operation: OutboxOperation): Promise<void> {
    if (operation.entity === 'favorite') {
      if (operation.operation === 'upsert') {
        await adapter.upsertFavorites([favoriteToRemote(operation.payload)]);
        return;
      }

      await adapter.deleteFavorites([operation.entityId]);
      return;
    }

    if (operation.operation === 'push') {
      await adapter.pushHistory([historyToRemote(operation)]);
      return;
    }

    await adapter.clearRemoteHistory();
  }

  async function pushPending(adapter: SyncAdapter): Promise<void> {
    const pending = await deps.outbox.listPending();

    for (const operation of pending) {
      if (operation.id === undefined) {
        continue;
      }

      try {
        await applyOperation(adapter, operation);
        await deps.outbox.markSent(operation.id);
      } catch (error) {
        await deps.outbox.markFailed(operation.id);
        throw error;
      }
    }
  }

  async function pullFavorites(adapter: SyncAdapter): Promise<void> {
    const since = (await deps.meta.get('lastPulledAt')) ?? EPOCH_ISO;
    const remote = await adapter.pullFavorites(since);

    if (remote.length > 0) {
      const local = await deps.repoFavorites.list();
      const localById = new Map(local.map((favorite) => [favorite.showId, favorite]));
      const merged = mergeFavorites(local, remote);

      for (const favorite of merged) {
        const existing = localById.get(favorite.showId);
        const changed =
          existing === undefined ||
          existing.updatedAt !== favorite.updatedAt ||
          existing.deletedAt !== favorite.deletedAt ||
          existing.syncStatus !== favorite.syncStatus;

        if (changed) {
          await deps.repoFavorites.add(favorite);
        }
      }

      const cursor = remote.reduce(
        (latest, favorite) => (favorite.updatedAt > latest ? favorite.updatedAt : latest),
        since,
      );
      await deps.meta.set('lastPulledAt', cursor);
    }
  }

  async function runSync(): Promise<void> {
    const adapter = deps.adapter;

    if (adapter === null) {
      setStatus({ state: 'local-only' });
      return;
    }

    if (!isOnline()) {
      setStatus({ state: 'offline' });
      return;
    }

    setStatus({ state: 'syncing' });

    try {
      const userId = await adapter.ensureSession();
      await deps.meta.set('userId', userId);

      await pushPending(adapter);
      await pullFavorites(adapter);

      const lastSyncedAt = clock();
      await deps.meta.set('lastSyncAt', lastSyncedAt);
      setStatus({ state: 'idle', lastSyncedAt });
    } catch (error) {
      setStatus({ state: 'error', lastError: errorMessage(error) });
    }
  }

  return {
    getStatus: () => status,

    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    syncNow: () => {
      if (inFlight === null) {
        inFlight = runSync().finally(() => {
          inFlight = null;
        });
      }
      return inFlight;
    },
  };
}
