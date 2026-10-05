import type {
  RemoteFavorite,
  RemoteHistoryEntry,
  RemoteUsageEvent,
  SyncAdapter,
} from '@/application/ports/sync-adapter';
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

/** Transiciones del motor reportadas a telemetría (RF-11). */
export type SyncEngineEvent = 'sync_success' | 'sync_error';

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
  /**
   * Observador de transiciones para telemetría. Se invoca solo cuando la
   * corrida tocó operaciones que no son de telemetría: así el propio evento
   * `sync_success`/`sync_error` nunca realimenta un bucle infinito de sync.
   */
  onSyncEvent?: (event: SyncEngineEvent, payload?: Record<string, unknown>) => void;
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

function telemetryToRemote(operation: OutboxOperation): RemoteUsageEvent {
  if (operation.entity !== 'telemetry' || operation.operation !== 'push') {
    throw new Error('La operación no es un push de telemetría.');
  }

  const { payload } = operation;

  return {
    id: payload.id,
    eventType: payload.eventType,
    occurredAt: payload.occurredAt,
    timezone: payload.timezone,
    country: payload.country,
    appVersion: payload.appVersion,
    payload: payload.payload,
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

    if (operation.entity === 'telemetry') {
      if (operation.operation === 'push') {
        await adapter.pushEvents([telemetryToRemote(operation)]);
        return;
      }

      await adapter.clearRemoteEvents();
      return;
    }

    if (operation.operation === 'push') {
      await adapter.pushHistory([historyToRemote(operation)]);
      return;
    }

    await adapter.clearRemoteHistory();
  }

  function report(event: SyncEngineEvent, payload?: Record<string, unknown>): void {
    try {
      deps.onSyncEvent?.(event, payload);
    } catch {
      // La observabilidad jamás interrumpe la sincronización.
    }
  }

  /** Empuja el outbox en orden y cuenta las operaciones que no son de telemetría. */
  async function pushPending(adapter: SyncAdapter): Promise<number> {
    const pending = await deps.outbox.listPending();
    let pushedNonTelemetry = 0;

    for (const operation of pending) {
      if (operation.id === undefined) {
        continue;
      }

      try {
        await applyOperation(adapter, operation);
        await deps.outbox.markSent(operation.id);

        if (operation.entity !== 'telemetry') {
          pushedNonTelemetry += 1;
        }
      } catch (error) {
        await deps.outbox.markFailed(operation.id);

        // Un fallo de telemetría no genera otro evento (evita bucles).
        if (operation.entity !== 'telemetry') {
          report('sync_error', { entity: operation.entity });
        }

        throw error;
      }
    }

    return pushedNonTelemetry;
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

      const pushedNonTelemetry = await pushPending(adapter);
      await pullFavorites(adapter);

      const lastSyncedAt = clock();
      await deps.meta.set('lastSyncAt', lastSyncedAt);
      setStatus({ state: 'idle', lastSyncedAt });

      // Solo se reporta cuando la corrida tocó datos funcionales: si no, el
      // propio evento de telemetría se reencolaría en cada sync (bucle).
      if (pushedNonTelemetry > 0) {
        report('sync_success', { pushed: pushedNonTelemetry });
      }
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
