import { describe, expect, it } from 'vitest';

import { isReminderRunDue, REMINDER_INTERVAL_MS } from './use-episode-reminders';

describe('isReminderRunDue', () => {
  it('considera la corrida pendiente si nunca se ha ejecutado', () => {
    expect(isReminderRunDue(1_000_000, null)).toBe(true);
  });

  it('no vuelve a correr dentro de la misma hora', () => {
    const now = 1_000_000;

    expect(isReminderRunDue(now, now - REMINDER_INTERVAL_MS / 2)).toBe(false);
  });

  it('vuelve a correr cuando pasa una hora', () => {
    const now = 1_000_000;

    expect(isReminderRunDue(now, now - REMINDER_INTERVAL_MS)).toBe(true);
  });

  it('trata una marca corrupta como pendiente', () => {
    expect(isReminderRunDue(1_000_000, Number.NaN)).toBe(true);
  });
});
