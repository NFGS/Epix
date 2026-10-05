import { describe, expect, it } from 'vitest';

import type { UsageEvent } from '@/domain/entities/usage-event';
import type {
  NewOutboxOperation,
  OutboxOperation,
  OutboxRepository,
} from '@/domain/ports/outbox-repository';
import type { UsageEventsRepository } from '@/domain/ports/usage-events-repository';

import { createTelemetryService, type TelemetryPreferences } from './telemetry-service';

const NOW = '2026-10-05T12:00:00.000Z';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';

function createEventsRepo(sink: UsageEvent[]): UsageEventsRepository {
  return {
    async add(event) {
      sink.push(event);
    },
    async list() {
      return [];
    },
    async clear() {
      // no-op
    },
  };
}

function createOutbox(sink: NewOutboxOperation[]): OutboxRepository {
  return {
    async enqueue(operation): Promise<OutboxOperation> {
      sink.push(operation);
      return { ...operation, attempts: 0, status: 'pending' } as OutboxOperation;
    },
    async listPending() {
      return [];
    },
    async markSent() {
      // no-op
    },
    async markFailed() {
      // no-op
    },
  };
}

function createHarness(
  preferences: TelemetryPreferences,
  overrides: {
    getPreferences?: () => Promise<TelemetryPreferences>;
    addEvent?: (event: UsageEvent) => Promise<void>;
  } = {},
) {
  const added: UsageEvent[] = [];
  const enqueued: NewOutboxOperation[] = [];
  const eventsRepo = createEventsRepo(added);
  const outbox = createOutbox(enqueued);

  if (overrides.addEvent !== undefined) {
    eventsRepo.add = overrides.addEvent;
  }

  const service = createTelemetryService({
    eventsRepo,
    outbox,
    getPreferences: overrides.getPreferences ?? (async () => preferences),
    now: () => NOW,
    uuid: () => EVENT_ID,
    timezone: () => 'America/Bogota',
    appVersion: '9.9.9',
  });

  return { service, added, enqueued };
}

describe('telemetry service (RF-11)', () => {
  it('con telemetría desactivada no persiste ni encola absolutamente nada (CA-11.2)', async () => {
    const { service, added, enqueued } = createHarness({
      telemetryEnabled: false,
      country: 'CO',
    });

    await service.track('search', { query: 'girls', results: 3 });

    expect(added).toEqual([]);
    expect(enqueued).toEqual([]);
  });

  it('con telemetría activada persiste el evento y encola su push idempotente', async () => {
    const { service, added, enqueued } = createHarness({
      telemetryEnabled: true,
      country: null,
    });

    await service.track('search', { query: 'girls', results: 3 });

    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({
      id: EVENT_ID,
      eventType: 'search',
      payload: { query: 'girls', results: 3 },
    });
    expect(enqueued).toEqual([
      expect.objectContaining({
        entity: 'telemetry',
        operation: 'push',
        entityId: EVENT_ID,
        opId: EVENT_ID,
        createdAt: NOW,
      }),
    ]);
  });

  it('enriquece el evento con fecha, zona horaria, versión y país', async () => {
    const { service, added } = createHarness({ telemetryEnabled: true, country: 'CO' });

    await service.track('session_start');

    expect(added[0]).toMatchObject({
      id: EVENT_ID,
      occurredAt: NOW,
      timezone: 'America/Bogota',
      appVersion: '9.9.9',
      country: 'CO',
    });
    expect(added[0]?.payload).toBeUndefined();
  });

  it('omite el país cuando la preferencia es nula', async () => {
    const { service, added } = createHarness({ telemetryEnabled: true, country: null });

    await service.track('session_start');

    expect(added[0]?.country).toBeUndefined();
  });

  it('sanea el payload: quita undefined y claves sensibles y recorta cadenas', async () => {
    const { service, added } = createHarness({ telemetryEnabled: true, country: null });

    await service.track('search', {
      query: 'girls',
      results: 3,
      drop: undefined,
      email: 'persona@ejemplo.com',
      nested: { token: 'abc', keep: true, inner: undefined },
      long: 'x'.repeat(500),
    });

    expect(added[0]?.payload).toEqual({
      query: 'girls',
      results: 3,
      nested: { keep: true },
      long: `${'x'.repeat(200)}…`,
    });
  });

  it('nunca lanza cuando las preferencias o el repositorio fallan', async () => {
    const failing = createHarness(
      { telemetryEnabled: true, country: null },
      {
        getPreferences: async () => {
          throw new Error('sin IndexedDB');
        },
      },
    );

    await expect(failing.service.track('session_start')).resolves.toBeUndefined();

    const repoFailure = createHarness(
      { telemetryEnabled: true, country: null },
      {
        addEvent: async () => {
          throw new Error('cuota excedida');
        },
      },
    );

    await expect(repoFailure.service.track('session_start')).resolves.toBeUndefined();
    expect(repoFailure.enqueued).toEqual([]);
  });
});

describe('sanitizePayload a través del servicio', () => {
  it('devuelve undefined si el payload queda vacío', async () => {
    const { service, added } = createHarness({ telemetryEnabled: true, country: null });

    await service.track('session_start', { email: 'persona@ejemplo.com', drop: undefined });

    expect(added[0]?.payload).toBeUndefined();
  });
});
