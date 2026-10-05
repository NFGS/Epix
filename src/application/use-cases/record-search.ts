import type { HistoryEntry } from '@/domain/entities/history-entry';
import type { HistoryRepository } from '@/domain/ports/history-repository';
import type { OutboxRepository } from '@/domain/ports/outbox-repository';

export interface RecordSearchDeps {
  history: HistoryRepository;
  outbox: OutboxRepository;
  now: () => string;
  uuid: () => string;
  timezone: () => string;
}

export interface RecordSearchInput {
  query: string;
  resultCount: number;
}

/** Registra una búsqueda con su número de resultados y la encola para sincronizar. */
export async function recordSearch(deps: RecordSearchDeps, input: RecordSearchInput): Promise<void> {
  const occurredAt = deps.now();
  const opId = deps.uuid();

  const entry: HistoryEntry = {
    type: 'search',
    query: input.query,
    resultCount: input.resultCount,
    occurredAt,
    timezone: deps.timezone(),
    syncStatus: 'pending',
  };

  await deps.history.addSearch(entry);
  await deps.outbox.enqueue({
    entity: 'history',
    operation: 'push',
    entityId: opId,
    payload: entry,
    opId,
    createdAt: occurredAt,
  });
}
