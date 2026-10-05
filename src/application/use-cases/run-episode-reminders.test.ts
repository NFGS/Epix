import { describe, expect, it, vi } from 'vitest';

import type { FavoriteShow } from '@/domain/entities/favorite';
import { DEFAULT_PREFERENCES, type UserPreferences } from '@/domain/entities/preferences';
import type { Episode } from '@/domain/entities/show';
import type { NotificationsPort, NotificationPermissionState } from '@/domain/ports/notifications';
import type { NotifiedRepository } from '@/domain/ports/notified-repository';

import { runEpisodeReminders, type RunEpisodeRemindersDeps } from './run-episode-reminders';

const T1 = '2026-10-05T15:00:00.000Z';
const TODAY = new Date(2026, 9, 5, 10, 0, 0);

const favorite: FavoriteShow = {
  showId: 7,
  name: 'Girls',
  genres: ['Drama'],
  addedAt: T1,
  updatedAt: T1,
  syncStatus: 'pending',
};

const nextEpisode: Episode = {
  id: 5,
  name: 'Pilot',
  season: 1,
  number: 2,
  airdate: '2026-10-05',
};

const labels = { title: 'Nuevo episodio hoy', bodyTemplate: '{show} — {code}' };

function preferences(overrides: Partial<UserPreferences> = {}): UserPreferences {
  return { ...DEFAULT_PREFERENCES, updatedAt: T1, notificationsEnabled: true, ...overrides };
}

function createDeps(overrides: Partial<RunEpisodeRemindersDeps> = {}) {
  const showLocalNotification = vi.fn(async () => undefined);
  const notifications: Pick<NotificationsPort, 'getPermissionState' | 'showLocalNotification'> = {
    getPermissionState: vi.fn((): NotificationPermissionState => 'granted'),
    showLocalNotification,
  };
  const notified: NotifiedRepository = {
    isNotified: vi.fn(async () => false),
    markNotified: vi.fn(async () => undefined),
  };

  return {
    deps: {
      preferences: { get: vi.fn(async () => preferences()) },
      favorites: { list: vi.fn(async () => [favorite]) },
      shows: { getNextEpisode: vi.fn(async () => nextEpisode) },
      notified,
      notifications,
      labels,
      now: () => TODAY,
      ...overrides,
    } satisfies RunEpisodeRemindersDeps,
    showLocalNotification,
    notified,
  };
}

describe('runEpisodeReminders', () => {
  it('no envía nada cuando la preferencia está desactivada', async () => {
    const { deps, showLocalNotification } = createDeps({
      preferences: { get: vi.fn(async () => preferences({ notificationsEnabled: false })) },
    });

    await expect(runEpisodeReminders(deps)).resolves.toEqual({ status: 'disabled' });
    expect(showLocalNotification).not.toHaveBeenCalled();
  });

  it('no envía nada cuando el permiso está denegado', async () => {
    const { deps, showLocalNotification } = createDeps();
    deps.notifications.getPermissionState = vi.fn((): NotificationPermissionState => 'denied');

    await expect(runEpisodeReminders(deps)).resolves.toEqual({ status: 'denied' });
    expect(showLocalNotification).not.toHaveBeenCalled();
  });

  it('reporta «unsupported» cuando el navegador no soporta notificaciones', async () => {
    const { deps } = createDeps();
    deps.notifications.getPermissionState = vi.fn((): NotificationPermissionState => 'unsupported');

    await expect(runEpisodeReminders(deps)).resolves.toEqual({ status: 'unsupported' });
  });

  it('envía la notificación del episodio de hoy y lo marca como notificado', async () => {
    const { deps, showLocalNotification, notified } = createDeps();

    await expect(runEpisodeReminders(deps)).resolves.toEqual({ status: 'sent', count: 1 });

    expect(showLocalNotification).toHaveBeenCalledWith({
      title: 'Nuevo episodio hoy',
      body: 'Girls — S1E02',
      url: '/shows/7',
      tag: 'ep-7-5',
    });
    expect(notified.markNotified).toHaveBeenCalledWith({
      key: '7:5',
      showId: 7,
      episodeId: 5,
      notifiedAt: TODAY.toISOString(),
    });
  });

  it('no envía nada si ninguna favorita estrena hoy', async () => {
    const { deps, showLocalNotification } = createDeps({
      shows: { getNextEpisode: vi.fn(async () => ({ ...nextEpisode, airdate: '2026-10-08' })) },
    });

    await expect(runEpisodeReminders(deps)).resolves.toEqual({ status: 'empty' });
    expect(showLocalNotification).not.toHaveBeenCalled();
  });

  it('no repite un aviso ya marcado en la tabla notified', async () => {
    const { deps, showLocalNotification, notified } = createDeps();
    notified.isNotified = vi.fn(async () => true);

    await expect(runEpisodeReminders(deps)).resolves.toEqual({ status: 'empty' });
    expect(showLocalNotification).not.toHaveBeenCalled();
  });
});
