import { describe, expect, it } from 'vitest';

import type { UsageEvent } from '@/domain/entities/usage-event';
import type {
  NewOutboxOperation,
  OutboxEntity,
  OutboxOperation,
  OutboxRepository,
} from '@/domain/ports/outbox-repository';
import type { UsageEventsRepository } from '@/domain/ports/usage-events-repository';

import { clearUsageEvents } from './clear-usage-events';

const NOW = '2026-10-05T14:32:00.000Z';

function createEvent(): UsageEvent {
  return {
    id: 'event-1',
    eventType: 'search',
    occurredAt: NOW,
    timezone: 'America/Bogota',
    appVersion: '0.1.0',
  };
}

function createHarness() {
  const events: UsageEvent[] = [createEvent()];
  const enqueued: NewOutboxOperation[] = [];
  const purged: OutboxEntity[] = [];

  const usageEvents: UsageEventsRepository = {
    add: async (event) => {
      events.push(event);
    },
    list: async () => [...events],
    clear: async () => {
      events.length = 0;
    },
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
    purgeByEntity: async (entity) => {
      purged.push(entity);
    },
  };

  return { usageEvents, outbox, events, enqueued, purged };
}

describe('clearUsageEvents (RNF-03 / R-01)', () => {
  it('borra lo local, purga el outbox de telemetría y encola el clear remoto', async () => {
    const { usageEvents, outbox, events, enqueued, purged } = createHarness();

    await clearUsageEvents({
      usageEvents,
      outbox,
      hasRemote: true,
      now: () => NOW,
      uuid: () => 'uuid-clear',
    });

    expect(events).toEqual([]);
    expect(purged).toEqual(['telemetry']);
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0]).toMatchObject({
      entity: 'telemetry',
      operation: 'clear',
      entityId: null,
      payload: null,
      opId: 'uuid-clear',
      createdAt: NOW,
    });
  });

  it('sin nube purga el outbox y no encola el clear remoto', async () => {
    const { usageEvents, outbox, events, enqueued, purged } = createHarness();

    await clearUsageEvents({
      usageEvents,
      outbox,
      hasRemote: false,
      now: () => NOW,
      uuid: () => 'uuid-clear',
    });

    expect(events).toEqual([]);
    expect(purged).toEqual(['telemetry']);
    expect(enqueued).toEqual([]);
  });
});
