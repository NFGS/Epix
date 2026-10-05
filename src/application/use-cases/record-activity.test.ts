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
import { MAX_HISTORY_QUERY_LENGTH, recordSearch } from './record-search';
import { recordView } from './record-view';

const NOW = '2026-10-05T14:32:00.000Z';
const TZ = 'America/Bogota';

function createFakeHistory() {
  const views: HistoryEntry[] = [];
  const searches: HistoryEntry[] = [];
  const cleared: string[] = [];

  const history: HistoryRepository = {
    addView: async (entry) => {
      views.push(entry);
    },
    addSearch: async (entry) => {
      searches.push(entry);
    },
    list: async () => [],
    listSearches: async () => [],
    clear: async () => {
      cleared.push(NOW);
    },
  };

  return { history, views, searches, cleared };
}

function createFakeOutbox() {
  const enqueued: NewOutboxOperation[] = [];
  const purged: OutboxEntity[] = [];

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

  return { outbox, enqueued, purged };
}

const clockDeps = { now: () => NOW, uuid: () => 'uuid-1', timezone: () => TZ };

describe('casos de uso de actividad', () => {
  it('recordView guarda la vista y encola el push', async () => {
    const { history, views } = createFakeHistory();
    const { outbox, enqueued } = createFakeOutbox();

    await recordView(
      { history, outbox, ...clockDeps },
      { showId: 7, showName: 'Dark' },
    );

    expect(views[0]).toMatchObject({
      type: 'view',
      showId: 7,
      showName: 'Dark',
      occurredAt: NOW,
      timezone: TZ,
      syncStatus: 'pending',
    });
    expect(enqueued[0]).toMatchObject({
      entity: 'history',
      operation: 'push',
      entityId: 'uuid-1',
      opId: 'uuid-1',
    });
  });

  it('recordSearch guarda la búsqueda con su número de resultados y encola', async () => {
    const { history, searches } = createFakeHistory();
    const { outbox, enqueued } = createFakeOutbox();

    await recordSearch({ history, outbox, ...clockDeps }, { query: 'dark', resultCount: 4 });

    expect(searches[0]).toMatchObject({
      type: 'search',
      query: 'dark',
      resultCount: 4,
      occurredAt: NOW,
      syncStatus: 'pending',
    });
    expect(enqueued[0]).toMatchObject({ entity: 'history', operation: 'push' });
  });

  it('recordSearch recorta la consulta a 120 caracteres antes de persistir (INFO-01)', async () => {
    const { history, searches } = createFakeHistory();
    const { outbox } = createFakeOutbox();
    const longQuery = 'x'.repeat(MAX_HISTORY_QUERY_LENGTH + 40);

    await recordSearch({ history, outbox, ...clockDeps }, { query: longQuery, resultCount: 1 });

    expect(searches[0]?.query).toBe('x'.repeat(MAX_HISTORY_QUERY_LENGTH));
    expect(searches[0]?.query).toHaveLength(MAX_HISTORY_QUERY_LENGTH);
  });

  it('clearHistory purga el outbox de historial y encola el borrado remoto', async () => {
    const { history, cleared } = createFakeHistory();
    const { outbox, enqueued, purged } = createFakeOutbox();

    await clearHistory({
      history,
      outbox,
      hasRemote: true,
      now: () => NOW,
      uuid: () => 'uuid-clear',
    });

    expect(cleared).toHaveLength(1);
    expect(purged).toEqual(['history']);
    expect(enqueued[0]).toMatchObject({
      entity: 'history',
      operation: 'clear',
      entityId: null,
      payload: null,
      opId: 'uuid-clear',
    });
  });

  it('clearHistory sin nube purga el outbox y no encola nada', async () => {
    const { history } = createFakeHistory();
    const { outbox, enqueued, purged } = createFakeOutbox();

    await clearHistory({
      history,
      outbox,
      hasRemote: false,
      now: () => NOW,
      uuid: () => 'uuid-clear',
    });

    expect(purged).toEqual(['history']);
    expect(enqueued).toEqual([]);
  });
});
