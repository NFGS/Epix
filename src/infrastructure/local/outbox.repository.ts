import type {
  NewOutboxOperation,
  OutboxEntity,
  OutboxOperation,
  OutboxRepository,
} from '@/domain/ports/outbox-repository';

import type { EpixDatabase } from './db';

/** Tras este número de intentos la operación queda en `failed` y no se reintenta. */
export const MAX_OUTBOX_ATTEMPTS = 5;

export function createOutboxRepository(
  db: EpixDatabase,
  uuid: () => string = () => crypto.randomUUID(),
): OutboxRepository {
  return {
    async enqueue(operation: NewOutboxOperation): Promise<OutboxOperation> {
      const record: OutboxOperation = {
        ...operation,
        opId: operation.opId ?? uuid(),
        attempts: 0,
        status: 'pending',
      };
      const id = await db.outbox.add(record);
      return { ...record, id };
    },

    async listPending(): Promise<OutboxOperation[]> {
      const pending = await db.outbox.where('status').equals('pending').toArray();
      return pending.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    },

    async markSent(id: number): Promise<void> {
      await db.outbox.update(id, {
        status: 'sent',
        lastAttemptAt: new Date().toISOString(),
      });
    },

    async markFailed(id: number): Promise<void> {
      const operation = await db.outbox.get(id);
      if (operation === undefined) {
        return;
      }

      const attempts = operation.attempts + 1;
      await db.outbox.update(id, {
        attempts,
        lastAttemptAt: new Date().toISOString(),
        status: attempts >= MAX_OUTBOX_ATTEMPTS ? 'failed' : 'pending',
      });
    },

    async purgeByEntity(entity: OutboxEntity): Promise<void> {
      await db.outbox.where('entity').equals(entity).delete();
    },
  };
}
