import { describe, expect, it } from 'vitest';

import type { HistoryEntry } from '@/domain/entities/history-entry';
import type { HistoryRepository } from '@/domain/ports/history-repository';
import type {
  NewOutboxOperation,
  OutboxEntity,
  OutboxOperation,
  OutboxRepository,
} from '@/domain/ports/outbox-repository';

import { clearHistory } from './clear-history';

function createHarness() {
  let entries: HistoryEntry[] = [
    {
      id: 1,
      type: 'view',
      occurredAt: '2026-10-05T14:32:00.000Z',
      syncStatus: 'synced',
    },
  ];
  const enqueued: NewOutboxOperation[] = [];
  const purged: OutboxEntity[] = [];

  const history: HistoryRepository = {
    addView: async (entry) => {
      entries.push(entry);
    },
    addSearch: async (entry) => {
      entries.push(entry);
    },
    list: async () => [...entries],
    listSearches: async () => [],
    clear: async () => {
      entries = [];
    },
  };

  const outbox: OutboxRepository = {
    enqueue: async (operation) => {
      enqueued.push(operation);
      return {
        ...operation,
        opId: operation.opId ?? 'generated',
        attempts: 0,
        status: 'pending',
      } as OutboxOperation;
    },
    listPending: async () => [],
    markSent: async () => undefined,
    markFailed: async () => undefined,
    purgeByEntity: async (entity) => {
      purged.push(entity);
    },
  };

  return { history, outbox, enqueued, purged, list: () => entries };
}

const NOW = '2026-10-06T14:00:00.000Z';

describe('clearHistory (R-01)', () => {
  it('vacía lo local, purga el outbox de historial y encola el borrado remoto', async () => {
    const harness = createHarness();

    await clearHistory({
      history: harness.history,
      outbox: harness.outbox,
      hasRemote: true,
      now: () => NOW,
      uuid: () => 'uuid-history',
    });

    expect(harness.list()).toEqual([]);
    expect(harness.purged).toEqual(['history']);
    expect(harness.enqueued).toEqual([
      {
        entity: 'history',
        operation: 'clear',
        entityId: null,
        payload: null,
        opId: 'uuid-history',
        createdAt: NOW,
      },
    ]);
  });

  it('sin nube limpia y purga, pero no encola el borrado remoto', async () => {
    const harness = createHarness();

    await clearHistory({
      history: harness.history,
      outbox: harness.outbox,
      hasRemote: false,
      now: () => NOW,
      uuid: () => 'uuid-history',
    });

    expect(harness.list()).toEqual([]);
    expect(harness.purged).toEqual(['history']);
    expect(harness.enqueued).toEqual([]);
  });
});
