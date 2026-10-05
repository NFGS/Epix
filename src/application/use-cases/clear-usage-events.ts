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
 * Borra toda la actividad local y, si hay nube, encola el borrado remoto
 * (derecho al olvido, RNF-03 / CA-11.1).
 */
export async function clearUsageEvents(deps: ClearUsageEventsDeps): Promise<void> {
  await deps.usageEvents.clear();

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
