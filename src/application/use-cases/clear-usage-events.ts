import type { OutboxRepository } from '@/domain/ports/outbox-repository';
import type { UsageEventsRepository } from '@/domain/ports/usage-events-repository';

export interface ClearUsageEventsDeps {
  usageEvents: UsageEventsRepository;
  outbox: OutboxRepository;
  /** `true` cuando hay Supabase configurado y toca borrar también en la nube. */
  hasRemote: boolean;
  now: () => string;
  uuid: () => string;
}

/**
 * Borra toda la actividad local, purga sus operaciones del outbox (R-01) y,
 * si hay nube, encola el borrado remoto después
 * (derecho al olvido, RNF-03 / CA-11.1).
 */
export async function clearUsageEvents(deps: ClearUsageEventsDeps): Promise<void> {
  await deps.usageEvents.clear();
  await deps.outbox.purgeByEntity('telemetry');

  if (!deps.hasRemote) {
    return;
  }

  await deps.outbox.enqueue({
    entity: 'telemetry',
    operation: 'clear',
    entityId: null,
    payload: null,
    opId: deps.uuid(),
    createdAt: deps.now(),
  });
}
