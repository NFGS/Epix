import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { UsageEvent } from '@/domain/entities/usage-event';

import { createEpixDatabase, type EpixDatabase } from './db';
import { createUsageEventsRepository } from './usage-events.repository';

function createEvent(index: number): UsageEvent {
  const seconds = String(index).padStart(2, '0');
  return {
    id: `event-${index}`,
    eventType: 'screen_view',
    occurredAt: `2026-10-05T10:00:${seconds}.000Z`,
    timezone: 'America/Bogota',
    appVersion: '0.1.0',
    payload: { path: '/', index },
  };
}

describe('repositorio local de telemetría (usageEvents)', () => {
  let db: EpixDatabase;

  beforeEach(() => {
    db = createEpixDatabase(`epix-usage-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    await db.delete();
  });

  it('guarda eventos y los lista del más reciente al más antiguo', async () => {
    const repo = createUsageEventsRepository(db);

    await repo.add(createEvent(1));
    await repo.add(createEvent(3));
    await repo.add(createEvent(2));

    const events = await repo.list();
    expect(events.map((event) => event.id)).toEqual(['event-3', 'event-2', 'event-1']);
    expect(events[0]?.payload).toEqual({ path: '/', index: 3 });
  });

  it('respeta el límite de listado', async () => {
    const repo = createUsageEventsRepository(db);

    await repo.add(createEvent(1));
    await repo.add(createEvent(2));

    expect(await repo.list(1)).toHaveLength(1);
    expect((await repo.list(1))[0]?.id).toBe('event-2');
  });

  it('poda los eventos más antiguos al superar el tope', async () => {
    const repo = createUsageEventsRepository(db, { maxEntries: 3 });

    for (let index = 1; index <= 6; index += 1) {
      await repo.add(createEvent(index));
    }

    const events = await repo.list();
    expect(events.map((event) => event.id)).toEqual(['event-6', 'event-5', 'event-4']);
    expect(await db.usageEvents.count()).toBe(3);
  });

  it('vacía todos los eventos', async () => {
    const repo = createUsageEventsRepository(db);

    await repo.add(createEvent(1));
    await repo.add(createEvent(2));

    await repo.clear();

    expect(await repo.list()).toEqual([]);
    expect(await db.usageEvents.count()).toBe(0);
  });
});
