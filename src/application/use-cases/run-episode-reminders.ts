import type { FavoriteShow } from '@/domain/entities/favorite';
import type { UserPreferences } from '@/domain/entities/preferences';
import type { Episode } from '@/domain/entities/show';
import type { NotificationsPort, NotificationPermissionState } from '@/domain/ports/notifications';
import type { NotifiedRepository } from '@/domain/ports/notified-repository';
import type { TelemetryPort } from '@/domain/ports/telemetry';
import { formatTemplate } from '@/shared/lib/format';

import {
  collectEpisodeReminders,
  episodeCode,
  reminderKey,
  type ReminderFavorite,
} from './collect-episode-reminders';

export interface EpisodeReminderLabels {
  /** Título de la notificación, p. ej. «Nuevo episodio hoy». */
  title: string;
  /** Plantilla del cuerpo con marcadores `{show}` y `{code}`. */
  bodyTemplate: string;
}

export interface RunEpisodeRemindersDeps {
  preferences: { get(): Promise<UserPreferences> };
  favorites: { list(): Promise<FavoriteShow[]> };
  shows: { getNextEpisode(showId: number): Promise<Episode | null> };
  notified: NotifiedRepository;
  notifications: Pick<NotificationsPort, 'getPermissionState' | 'showLocalNotification'>;
  labels: EpisodeReminderLabels;
  /** Telemetría opcional: registra `notification_shown` si el usuario la aceptó. */
  telemetry?: TelemetryPort;
  now?: () => Date;
  maxPerRun?: number;
}

export type EpisodeRemindersResult =
  | { readonly status: 'disabled' }
  | { readonly status: 'unsupported' }
  | { readonly status: 'denied' }
  | { readonly status: 'empty' }
  | { readonly status: 'sent'; readonly count: number };

function toFavorite(favorite: FavoriteShow): ReminderFavorite {
  return { showId: favorite.showId, name: favorite.name };
}

/**
 * Corrida de recordatorios (RF-10): respeta la preferencia y el permiso, busca
 * el próximo episodio de cada favorita, notifica los que se emiten hoy y marca
 * cada envío para no repetirlo entre sesiones.
 */
export async function runEpisodeReminders(
  deps: RunEpisodeRemindersDeps,
): Promise<EpisodeRemindersResult> {
  const preferences = await deps.preferences.get();
  if (!preferences.notificationsEnabled) {
    return { status: 'disabled' };
  }

  const permission: NotificationPermissionState = deps.notifications.getPermissionState();
  if (permission === 'unsupported') {
    return { status: 'unsupported' };
  }
  if (permission !== 'granted') {
    return { status: 'denied' };
  }

  const favoriteShows = await deps.favorites.list();
  const now = deps.now?.() ?? new Date();

  const reminders = await collectEpisodeReminders({
    favorites: favoriteShows.map(toFavorite),
    getNextEpisode: (showId) => deps.shows.getNextEpisode(showId),
    isNotified: (key) => deps.notified.isNotified(key),
    now,
    maxPerRun: deps.maxPerRun,
  });

  if (reminders.length === 0) {
    return { status: 'empty' };
  }

  for (const reminder of reminders) {
    await deps.notifications.showLocalNotification({
      title: deps.labels.title,
      body: formatTemplate(deps.labels.bodyTemplate, {
        show: reminder.showName,
        code: episodeCode(reminder.episode),
      }),
      url: `/shows/${reminder.showId}`,
      tag: `ep-${reminder.showId}-${reminder.episode.id}`,
    });

    await deps.notified.markNotified({
      key: reminderKey(reminder.showId, reminder.episode.id),
      showId: reminder.showId,
      episodeId: reminder.episode.id,
      notifiedAt: now.toISOString(),
    });

    void deps.telemetry?.track('notification_shown', {
      showId: reminder.showId,
      episodeId: reminder.episode.id,
    });
  }

  return { status: 'sent', count: reminders.length };
}
