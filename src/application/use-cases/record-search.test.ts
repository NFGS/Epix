import { describe, expect, it } from 'vitest';

import type { HistoryEntry } from '@/domain/entities/history-entry';
import type { HistoryRepository } from '@/domain/ports/history-repository';
import type {
  NewOutboxOperation,
  OutboxOperation,
  OutboxRepository,
} from '@/domain/ports/outbox-repository';

import { MAX_HISTORY_QUERY_LENGTH, recordSearch } from './record-search';

const NOW = '2026-10-06T14:00:00.000Z';

function createHarness() {
  const searches: HistoryEntry[] = [];
  const enqueued: NewOutboxOperation[] = [];

  const history: HistoryRepository = {
    addView: async () => undefined,
    addSearch: async (entry) => {
      searches.push(entry);
    },
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

  return { history, outbox, searches, enqueued };
}

function deps(harness: ReturnType<typeof createHarness>) {
  return {
    history: harness.history,
    outbox: harness.outbox,
    now: () => NOW,
    uuid: () => 'uuid-search',
    timezone: () => 'America/Bogota',
  };
}

describe('recordSearch', () => {
  it('guarda la búsqueda con su contexto y la encola para sincronizar', async () => {
    const harness = createHarness();

    await recordSearch(deps(harness), { query: 'dark', resultCount: 7 });

    expect(harness.searches).toEqual([
      {
        type: 'search',
        query: 'dark',
        resultCount: 7,
        occurredAt: NOW,
        timezone: 'America/Bogota',
        syncStatus: 'pending',
      },
    ]);
    expect(harness.enqueued).toEqual([
      {
        entity: 'history',
        operation: 'push',
        entityId: 'uuid-search',
        payload: harness.searches[0],
        opId: 'uuid-search',
        createdAt: NOW,
      },
    ]);
  });

  it('recorta la consulta al máximo permitido (INFO-01)', async () => {
    const harness = createHarness();
    const query = 'a'.repeat(MAX_HISTORY_QUERY_LENGTH + 40);

    await recordSearch(deps(harness), { query, resultCount: 1 });

    expect(harness.searches[0]?.query).toHaveLength(MAX_HISTORY_QUERY_LENGTH);
    expect(harness.searches[0]?.query).toBe(query.slice(0, MAX_HISTORY_QUERY_LENGTH));
  });

  it('conserva consultas cortas sin recortar', async () => {
    const harness = createHarness();

    await recordSearch(deps(harness), { query: 'lost', resultCount: 0 });

    expect(harness.searches[0]?.query).toBe('lost');
  });
});
