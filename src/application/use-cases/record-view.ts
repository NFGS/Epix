import type { HistoryEntry } from '@/domain/entities/history-entry';
import type { HistoryRepository } from '@/domain/ports/history-repository';
import type { OutboxRepository } from '@/domain/ports/outbox-repository';

export interface RecordViewDeps {
  history: HistoryRepository;
  outbox: OutboxRepository;
  now: () => string;
  uuid: () => string;
  timezone: () => string;
}

export interface RecordViewInput {
  showId: number;
  showName: string;
}

/** Registra la apertura de una serie y la encola para sincronizar. */
export async function recordView(deps: RecordViewDeps, input: RecordViewInput): Promise<void> {
  const occurredAt = deps.now();
  const opId = deps.uuid();

  const entry: HistoryEntry = {
    showId: input.showId,
    showName: input.showName,
    type: 'view',
    occurredAt,
    timezone: deps.timezone(),
    syncStatus: 'pending',
  };

  await deps.history.addView(entry);
  await deps.outbox.enqueue({
    entity: 'history',
    operation: 'push',
    entityId: opId,
    payload: entry,
    opId,
    createdAt: occurredAt,
  });
}
