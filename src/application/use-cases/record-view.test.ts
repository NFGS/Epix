import { describe, expect, it } from 'vitest';

import type { HistoryEntry } from '@/domain/entities/history-entry';
import type { HistoryRepository } from '@/domain/ports/history-repository';
import type {
  NewOutboxOperation,
  OutboxOperation,
  OutboxRepository,
} from '@/domain/ports/outbox-repository';

import { recordView } from './record-view';

const NOW = '2026-10-06T14:00:00.000Z';

function createHarness() {
  const views: HistoryEntry[] = [];
  const enqueued: NewOutboxOperation[] = [];

  const history: HistoryRepository = {
    addView: async (entry) => {
      views.push(entry);
    },
    addSearch: async () => undefined,
    list: async () => [],
    listSearches: async () => [],
    clear: async () => undefined,
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
    purgeByEntity: async () => undefined,
  };

  return { history, outbox, views, enqueued };
}

describe('recordView', () => {
  it('registra la apertura de la serie y la encola para sincronizar', async () => {
    const harness = createHarness();

    await recordView(
      {
        history: harness.history,
        outbox: harness.outbox,
        now: () => NOW,
        uuid: () => 'uuid-view',
        timezone: () => 'America/Bogota',
      },
      { showId: 82, showName: 'Game of Thrones' },
    );

    expect(harness.views).toEqual([
      {
        showId: 82,
        showName: 'Game of Thrones',
        type: 'view',
        occurredAt: NOW,
        timezone: 'America/Bogota',
        syncStatus: 'pending',
      },
    ]);
    expect(harness.enqueued).toEqual([
      {
        entity: 'history',
        operation: 'push',
        entityId: 'uuid-view',
        payload: harness.views[0],
        opId: 'uuid-view',
        createdAt: NOW,
      },
    ]);
  });
});
