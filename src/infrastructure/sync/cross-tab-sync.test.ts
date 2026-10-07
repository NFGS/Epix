import { describe, expect, it, vi } from 'vitest';

import type { SyncEngine, SyncEngineStatus } from '@/application/ports/sync-engine';

import {
  createCrossTabSyncEngine,
  parseSyncStatusMessage,
  SYNC_STATUS_MESSAGE,
  type SyncBroadcastChannelLike,
  type WebLocksLike,
} from './cross-tab-sync';

function createInnerEngine(options: { delayMs?: number } = {}) {
  const delayMs = options.delayMs ?? 0;
  const listeners = new Set<() => void>();
  let status: SyncEngineStatus = { state: 'idle' };
  const counters = { calls: 0, concurrent: 0, maxConcurrent: 0 };

  const engine: SyncEngine = {
    getStatus: () => status,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    syncNow: async () => {
      counters.calls += 1;
      counters.concurrent += 1;
      counters.maxConcurrent = Math.max(counters.maxConcurrent, counters.concurrent);
      await new Promise((resolve) => {
        setTimeout(resolve, delayMs);
      });
      counters.concurrent -= 1;
    },
  };

  return {
    engine,
    counters,
    setStatus(next: SyncEngineStatus) {
      status = next;
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

/** LockManager en serie: garantiza que solo un callback corre a la vez. */
function createQueueLocks(): WebLocksLike {
  let tail: Promise<unknown> = Promise.resolve();

  return {
    request: (_name, callback) => {
      const run = tail.then(() => callback());
      tail = run.catch(() => undefined);
      return run;
    },
  };
}

class FakeChannel implements SyncBroadcastChannelLike {
  posted: unknown[] = [];
  closed = false;
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;

  postMessage(message: unknown): void {
    this.posted.push(message);
  }

  close(): void {
    this.closed = true;
  }

  receive(data: unknown): void {
    this.onmessage?.({ data } as unknown as MessageEvent<unknown>);
  }
}

describe('cross-tab sync · Web Locks', () => {
  it('sin locks ejecuta el sync directo (fallback)', async () => {
    const inner = createInnerEngine();
    const wrapped = createCrossTabSyncEngine({ engine: inner.engine, locks: null, channel: null });

    await wrapped.syncNow();

    expect(inner.counters.calls).toBe(1);
  });

  it('con locks serializa dos syncNow concurrentes', async () => {
    const inner = createInnerEngine({ delayMs: 5 });
    const wrapped = createCrossTabSyncEngine({
      engine: inner.engine,
      locks: createQueueLocks(),
      channel: null,
    });

    await Promise.all([wrapped.syncNow(), wrapped.syncNow()]);

    expect(inner.counters.calls).toBe(2);
    expect(inner.counters.maxConcurrent).toBe(1);
  });

  it('sin locks, dos syncNow concurrentes se solapan (control)', async () => {
    const inner = createInnerEngine({ delayMs: 5 });
    const wrapped = createCrossTabSyncEngine({ engine: inner.engine, locks: null, channel: null });

    await Promise.all([wrapped.syncNow(), wrapped.syncNow()]);

    expect(inner.counters.maxConcurrent).toBe(2);
  });
});

describe('cross-tab sync · BroadcastChannel', () => {
  it('difunde cada transición del motor local', () => {
    const inner = createInnerEngine();
    const channel = new FakeChannel();
    createCrossTabSyncEngine({ engine: inner.engine, locks: null, channel });

    inner.setStatus({ state: 'syncing' });
    inner.setStatus({ state: 'idle', lastSyncedAt: 'T1' });
    inner.setStatus({ state: 'error', lastError: 'sin red' });

    expect(channel.posted).toHaveLength(3);
    expect(parseSyncStatusMessage(channel.posted[0])).toEqual({ state: 'syncing' });
    expect(parseSyncStatusMessage(channel.posted[1])).toEqual({
      state: 'idle',
      lastSyncedAt: 'T1',
    });
    expect(parseSyncStatusMessage(channel.posted[2])).toEqual({
      state: 'error',
      lastError: 'sin red',
    });
  });

  it('muestra el «Sincronizando…» de otra pestaña y notifica a los suscriptores', () => {
    const inner = createInnerEngine();
    const channel = new FakeChannel();
    const wrapped = createCrossTabSyncEngine({ engine: inner.engine, locks: null, channel });
    const listener = vi.fn();
    wrapped.subscribe(listener);

    channel.receive({ type: SYNC_STATUS_MESSAGE, status: { state: 'syncing' } });

    expect(wrapped.getStatus().state).toBe('syncing');
    expect(listener).toHaveBeenCalledTimes(1);

    channel.receive({ type: SYNC_STATUS_MESSAGE, status: { state: 'idle' } });

    expect(wrapped.getStatus().state).toBe('idle');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('el estado local `syncing` manda sobre el remoto', () => {
    const inner = createInnerEngine();
    const channel = new FakeChannel();
    const wrapped = createCrossTabSyncEngine({ engine: inner.engine, locks: null, channel });

    channel.receive({ type: SYNC_STATUS_MESSAGE, status: { state: 'syncing' } });
    inner.setStatus({ state: 'syncing' });

    expect(wrapped.getStatus().state).toBe('syncing');
  });

  it('ignora mensajes inválidos del canal', () => {
    const inner = createInnerEngine();
    const channel = new FakeChannel();
    const wrapped = createCrossTabSyncEngine({ engine: inner.engine, locks: null, channel });
    const listener = vi.fn();
    wrapped.subscribe(listener);

    channel.receive(null);
    channel.receive({ type: 'otro-canal', status: { state: 'syncing' } });
    channel.receive({ type: SYNC_STATUS_MESSAGE, status: { state: 'inventado' } });

    expect(wrapped.getStatus().state).toBe('idle');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('parseSyncStatusMessage', () => {
  it('normaliza estados y descarta campos no textuales', () => {
    expect(
      parseSyncStatusMessage({
        type: SYNC_STATUS_MESSAGE,
        status: { state: 'error', lastSyncedAt: 42, lastError: 'x' },
      }),
    ).toEqual({ state: 'error', lastError: 'x' });

    expect(parseSyncStatusMessage('texto')).toBeNull();
  });
});
