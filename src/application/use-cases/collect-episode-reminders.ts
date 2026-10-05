import type { Episode } from '@/domain/entities/show';
import { todayIso } from '@/shared/lib/date';

/** Máximo de recordatorios por corrida (protege el rate limit de TVmaze y evita spam). */
export const MAX_REMINDERS_PER_RUN = 3;

export interface ReminderFavorite {
  showId: number;
  name: string;
}

export interface EpisodeReminder {
  showId: number;
  showName: string;
  episode: Episode;
}

export interface CollectEpisodeRemindersDeps {
  favorites: ReadonlyArray<ReminderFavorite>;
  getNextEpisode: (showId: number) => Promise<Episode | null>;
  isNotified: (key: string) => Promise<boolean>;
  /** Fecha local de la corrida; se compara con `episode.airdate`. */
  now: Date;
  maxPerRun?: number;
}

/** Clave estable de deduplicación: `<showId>:<episodeId>`. */
export function reminderKey(showId: number, episodeId: number): string {
  return `${showId}:${episodeId}`;
}

/** Código legible del episodio: `S1E02`. */
export function episodeCode(episode: Episode): string {
  return `S${episode.season}E${String(episode.number).padStart(2, '0')}`;
}

/**
 * Selecciona los recordatorios que deben enviarse: favoritos cuyo próximo
 * episodio se emite hoy (fecha local), sin repetir avisos ya enviados y con un
 * límite por corrida. Un fallo puntual de TVmaze no tumba la corrida completa.
 */
export async function collectEpisodeReminders(
  deps: CollectEpisodeRemindersDeps,
): Promise<EpisodeReminder[]> {
  const today = todayIso(deps.now);
  const max = deps.maxPerRun ?? MAX_REMINDERS_PER_RUN;
  const seenShows = new Set<number>();
  const reminders: EpisodeReminder[] = [];

  for (const favorite of deps.favorites) {
    if (reminders.length >= max) {
      break;
    }

    if (seenShows.has(favorite.showId)) {
      continue;
    }
    seenShows.add(favorite.showId);

    let episode: Episode | null;
    try {
      episode = await deps.getNextEpisode(favorite.showId);
    } catch {
      continue;
    }

    if (episode === null || episode.airdate !== today) {
      continue;
    }

    if (await deps.isNotified(reminderKey(favorite.showId, episode.id))) {
      continue;
    }

    reminders.push({ showId: favorite.showId, showName: favorite.name, episode });
  }

  return reminders;
}
