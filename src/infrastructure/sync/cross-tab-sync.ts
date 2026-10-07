import type { SyncEngine, SyncEngineState, SyncEngineStatus } from '@/application/ports/sync-engine';

/** Nombre del Web Lock que serializa el sync entre pestañas. */
export const SYNC_LOCK_NAME = 'epix:sync';
/** Nombre del BroadcastChannel que difunde el estado del sync. */
export const SYNC_CHANNEL_NAME = 'epix-sync';
/** Discriminante de los mensajes difundidos por el canal. */
export const SYNC_STATUS_MESSAGE = 'epix:sync-status';

/** Subconjunto de `LockManager` que usamos (inyectable en pruebas). */
export interface WebLocksLike {
  request(name: string, callback: () => Promise<void>): Promise<unknown>;
}

/** Subconjunto de `BroadcastChannel` que usamos (inyectable en pruebas). */
export interface SyncBroadcastChannelLike {
  postMessage(message: unknown): void;
  close(): void;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
}

const SYNC_STATES: readonly SyncEngineState[] = [
  'local-only',
  'idle',
  'syncing',
  'offline',
  'error',
];

function isSyncState(value: unknown): value is SyncEngineState {
  return typeof value === 'string' && (SYNC_STATES as readonly string[]).includes(value);
}

/** Valida y normaliza un mensaje del canal; `null` si no es un estado de sync. */
export function parseSyncStatusMessage(data: unknown): SyncEngineStatus | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }

  const message = data as { type?: unknown; status?: unknown };

  if (
    message.type !== SYNC_STATUS_MESSAGE ||
    typeof message.status !== 'object' ||
    message.status === null
  ) {
    return null;
  }

  const status = message.status as { state?: unknown; lastSyncedAt?: unknown; lastError?: unknown };

  if (!isSyncState(status.state)) {
    return null;
  }

  const parsed: SyncEngineStatus = { state: status.state };

  if (typeof status.lastSyncedAt === 'string') {
    parsed.lastSyncedAt = status.lastSyncedAt;
  }

  if (typeof status.lastError === 'string') {
    parsed.lastError = status.lastError;
  }

  return parsed;
}

function defaultLocks(): WebLocksLike | null {
  if (typeof navigator === 'undefined' || navigator.locks === undefined) {
    return null;
  }

  return {
    request: (name, callback) => navigator.locks.request(name, callback),
  };
}

function defaultChannel(): SyncBroadcastChannelLike | null {
  if (typeof BroadcastChannel === 'undefined') {
    return null;
  }

  return new BroadcastChannel(SYNC_CHANNEL_NAME);
}

export interface CrossTabSyncOptions {
  /** Motor real (`createSyncEngine`). */
  engine: SyncEngine;
  /** Web Locks; `null` fuerza el fallback sin locks. Por defecto `navigator.locks`. */
  locks?: WebLocksLike | null;
  /** Canal de difusión; `null` lo desactiva. Por defecto `BroadcastChannel('epix-sync')`. */
  channel?: SyncBroadcastChannelLike | null;
}

/**
 * Envuelve el motor de sync para trabajar con varias pestañas:
 *
 * - **Web Locks** (`epix:sync`): dos `syncNow()` concurrentes se serializan;
 *   si el navegador no soporta locks, se ejecuta directo (fallback).
 * - **BroadcastChannel** (`epix-sync`): difunde cada transición (syncing/idle/
 *   error) y muestra en esta pestaña el «Sincronizando…» de otra pestaña.
 */
export function createCrossTabSyncEngine({
  engine,
  locks,
  channel,
}: CrossTabSyncOptions): SyncEngine {
  const locksApi = locks === undefined ? defaultLocks() : locks;
  const syncChannel = channel === undefined ? defaultChannel() : channel;

  const listeners = new Set<() => void>();
  let remoteSyncing = false;

  function notify(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  engine.subscribe(() => {
    if (syncChannel !== null) {
      try {
        syncChannel.postMessage({ type: SYNC_STATUS_MESSAGE, status: engine.getStatus() });
      } catch {
        // El canal puede estar cerrado (pestaña descargándose): no interrumpe el sync.
      }
    }

    notify();
  });

  if (syncChannel !== null) {
    syncChannel.onmessage = (event) => {
      const status = parseSyncStatusMessage(event.data);

      if (status === null) {
        return;
      }

      if (status.state === 'syncing') {
        remoteSyncing = true;
        notify();
        return;
      }

      if (remoteSyncing) {
        remoteSyncing = false;
        notify();
      }
    };
  }

  return {
    getStatus: () => {
      const local = engine.getStatus();

      if (!remoteSyncing || local.state === 'syncing') {
        return local;
      }

      return { state: 'syncing', lastSyncedAt: local.lastSyncedAt };
    },

    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    syncNow: async () => {
      if (locksApi === null) {
        await engine.syncNow();
        return;
      }

      await locksApi.request(SYNC_LOCK_NAME, async () => {
        await engine.syncNow();
      });
    },
  };
}
