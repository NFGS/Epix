import type { HistoryRepository } from '@/domain/ports/history-repository';
import type { OutboxRepository } from '@/domain/ports/outbox-repository';

export interface ClearHistoryDeps {
  history: HistoryRepository;
  outbox: OutboxRepository;
  now: () => string;
  uuid: () => string;
}

/** Vacía el historial local y encola el borrado remoto. */
export async function clearHistory(deps: ClearHistoryDeps): Promise<void> {
  await deps.history.clear();
  await deps.outbox.enqueue({
    entity: 'history',
    operation: 'clear',
    entityId: null,
    payload: null,
    opId: deps.uuid(),
    createdAt: deps.now(),
  });
}
