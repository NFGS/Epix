import type { HistoryRepository } from '@/domain/ports/history-repository';
import type { OutboxRepository } from '@/domain/ports/outbox-repository';

export interface ClearHistoryDeps {
  history: HistoryRepository;
  outbox: OutboxRepository;
  /** `true` cuando hay Supabase configurado y toca borrar también en la nube. */
  hasRemote: boolean;
  now: () => string;
  uuid: () => string;
}

/**
 * Vacía el historial local, purga sus operaciones del outbox (R-01) y, si hay
 * nube, encola el borrado remoto después.
 */
export async function clearHistory(deps: ClearHistoryDeps): Promise<void> {
  await deps.history.clear();
  await deps.outbox.purgeByEntity('history');

  if (!deps.hasRemote) {
    return;
  }

  await deps.outbox.enqueue({
    entity: 'history',
    operation: 'clear',
    entityId: null,
    payload: null,
    opId: deps.uuid(),
    createdAt: deps.now(),
  });
}
