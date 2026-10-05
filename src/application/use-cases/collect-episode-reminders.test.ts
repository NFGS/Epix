import { describe, expect, it, vi } from 'vitest';

import type { Episode } from '@/domain/entities/show';

import {
  collectEpisodeReminders,
  episodeCode,
  MAX_REMINDERS_PER_RUN,
  reminderKey,
  type CollectEpisodeRemindersDeps,
  type ReminderFavorite,
} from './collect-episode-reminders';

const TODAY = new Date(2026, 9, 5, 12, 0, 0);

function episode(overrides: Partial<Episode> = {}): Episode {
  return { id: 5, name: 'Pilot', season: 1, number: 2, airdate: '2026-10-05', ...overrides };
}

function favorite(showId: number, name = `Serie ${showId}`): ReminderFavorite {
  return { showId, name };
}

function createDeps(overrides: Partial<CollectEpisodeRemindersDeps> = {}) {
  return {
    favorites: [favorite(1)],
    getNextEpisode: vi.fn(async () => episode()),
    isNotified: vi.fn(async () => false),
    now: TODAY,
    ...overrides,
  } satisfies CollectEpisodeRemindersDeps;
}

describe('collectEpisodeReminders', () => {
  it('selecciona solo los episodios que se emiten hoy (no los de mañana)', async () => {
    const deps = createDeps({
      favorites: [favorite(1, 'Hoy'), favorite(2, 'Mañana')],
      getNextEpisode: vi.fn(async (showId: number) =>
        showId === 1 ? episode() : episode({ id: 9, airdate: '2026-10-06' }),
      ),
    });

    const reminders = await collectEpisodeReminders(deps);

    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({ showId: 1, showName: 'Hoy' });
  });

  it('descarta los episodios ya notificados', async () => {
    const deps = createDeps({
      favorites: [favorite(1), favorite(2)],
      isNotified: vi.fn(async (key: string) => key === reminderKey(1, 5)),
    });

    const reminders = await collectEpisodeReminders(deps);

    expect(reminders.map((reminder) => reminder.showId)).toEqual([2]);
  });

  it('limita la corrida a 3 recordatorios y deja de consultar TVmaze', async () => {
    const getNextEpisode = vi.fn(async () => episode());
    const deps = createDeps({
      favorites: [1, 2, 3, 4, 5].map((id) => favorite(id)),
      getNextEpisode,
    });

    const reminders = await collectEpisodeReminders(deps);

    expect(reminders).toHaveLength(MAX_REMINDERS_PER_RUN);
    expect(getNextEpisode).toHaveBeenCalledTimes(MAX_REMINDERS_PER_RUN);
  });

  it('no consulta nada si no hay favoritos', async () => {
    const deps = createDeps({ favorites: [] });

    await expect(collectEpisodeReminders(deps)).resolves.toEqual([]);
    expect(deps.getNextEpisode).not.toHaveBeenCalled();
  });

  it('salta una serie cuyo episodio falla y continúa con la siguiente', async () => {
    const deps = createDeps({
      favorites: [favorite(1), favorite(2)],
      getNextEpisode: vi.fn(async (showId: number) => {
        if (showId === 1) {
          throw new Error('TVmaze caído');
        }
        return episode({ id: 6, airdate: '2026-10-05' });
      }),
    });

    const reminders = await collectEpisodeReminders(deps);

    expect(reminders.map((reminder) => reminder.showId)).toEqual([2]);
  });

  it('ignora series sin próximo episodio', async () => {
    const deps = createDeps({ getNextEpisode: vi.fn(async () => null) });

    await expect(collectEpisodeReminders(deps)).resolves.toEqual([]);
  });
});

describe('helpers de recordatorios', () => {
  it('construye la clave de deduplicación showId:episodeId', () => {
    expect(reminderKey(7, 12)).toBe('7:12');
  });

  it('formatea el código del episodio como SxEyy', () => {
    expect(episodeCode({ id: 1, name: 'Pilot', season: 3, number: 4 })).toBe('S3E04');
    expect(episodeCode({ id: 1, name: 'Pilot', season: 1, number: 12 })).toBe('S1E12');
  });
});
