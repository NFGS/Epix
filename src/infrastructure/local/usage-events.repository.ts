import type { UsageEvent } from '@/domain/entities/usage-event';
import type { UsageEventsRepository } from '@/domain/ports/usage-events-repository';

import type { EpixDatabase } from './db';

/** Tope local de eventos: al superarlo se podan los más antiguos. */
export const MAX_USAGE_EVENTS = 500;

export interface UsageEventsRepositoryOptions {
  /** Tope de eventos conservados; por defecto {@link MAX_USAGE_EVENTS}. */
  maxEntries?: number;
}

/**
 * Repositorio Dexie de `usageEvents`. Cada inserción poda los eventos más
 * antiguos dentro de la misma transacción para no crecer sin límite (RF-11).
 */
export function createUsageEventsRepository(
  db: EpixDatabase,
  options: UsageEventsRepositoryOptions = {},
): UsageEventsRepository {
  const maxEntries = options.maxEntries ?? MAX_USAGE_EVENTS;

  return {
    async add(event: UsageEvent): Promise<void> {
      await db.transaction('rw', db.usageEvents, async () => {
        await db.usageEvents.put(event);

        const count = await db.usageEvents.count();
        if (count <= maxEntries) {
          return;
        }

        const oldestIds = await db.usageEvents
          .orderBy('occurredAt')
          .limit(count - maxEntries)
          .primaryKeys();
        await db.usageEvents.bulkDelete(oldestIds);
      });
    },

    async list(limit?: number): Promise<UsageEvent[]> {
      const ordered = db.usageEvents.orderBy('occurredAt').reverse();
      return limit === undefined ? ordered.toArray() : ordered.limit(limit).toArray();
    },

    async clear(): Promise<void> {
      await db.usageEvents.clear();
    },
  };
}
