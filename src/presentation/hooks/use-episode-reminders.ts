import { useCallback, useState } from 'react';

import {
  runEpisodeReminders,
  type EpisodeRemindersResult,
} from '@/application/use-cases/run-episode-reminders';
import { useI18n } from '@/shared/i18n/i18n-context';

import { useDependencies } from './dependencies-context';
import { useRepositories } from './repositories-context';

export const REMINDER_INTERVAL_MS = 60 * 60 * 1000;
export const LAST_REMINDER_STORAGE_KEY = 'epix:last-reminder-run';

/** Resultado visible en UI: el del caso de uso o un fallo inesperado local. */
export type EpisodeRemindersOutcome = EpisodeRemindersResult | { readonly status: 'error' };

export interface EpisodeRemindersHandle {
  status: 'idle' | 'running' | 'done';
  result: EpisodeRemindersOutcome | null;
  checkNow: () => Promise<EpisodeRemindersOutcome>;
}

type ReminderStorage = Pick<Storage, 'getItem' | 'setItem'>;

function resolveStorage(): ReminderStorage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Una corrida es válida si nunca se ha hecho o si pasó al menos una hora. */
export function isReminderRunDue(now: number, lastRunAt: number | null): boolean {
  return lastRunAt === null || Number.isNaN(lastRunAt) || now - lastRunAt >= REMINDER_INTERVAL_MS;
}

export function readLastReminderRun(
  storage: ReminderStorage | null = resolveStorage(),
): number | null {
  try {
    const stored = storage?.getItem(LAST_REMINDER_STORAGE_KEY) ?? null;
    return stored === null ? null : Number(stored);
  } catch {
    return null;
  }
}

export function writeLastReminderRun(
  at: number,
  storage: ReminderStorage | null = resolveStorage(),
): void {
  try {
    storage?.setItem(LAST_REMINDER_STORAGE_KEY, String(at));
  } catch {
    // Sin persistencia: la corrida igualmente ocurre una vez por sesión.
  }
}

/** Dispara la corrida de recordatorios con los datos de la app y expone su estado. */
export function useEpisodeReminders(): EpisodeRemindersHandle {
  const { preferences, favorites, notified, notifications } = useDependencies();
  const { shows } = useRepositories();
  const { t } = useI18n();
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [result, setResult] = useState<EpisodeRemindersOutcome | null>(null);

  const checkNow = useCallback(async (): Promise<EpisodeRemindersOutcome> => {
    setStatus('running');
    try {
      const outcome = await runEpisodeReminders({
        preferences,
        favorites,
        shows,
        notified,
        notifications,
        labels: {
          title: t.notificationsContent.episodeTodayTitle,
          bodyTemplate: t.notificationsContent.episodeTodayBody,
        },
      });
      setResult(outcome);
      return outcome;
    } catch {
      const outcome: EpisodeRemindersOutcome = { status: 'error' };
      setResult(outcome);
      return outcome;
    } finally {
      setStatus('done');
    }
  }, [preferences, favorites, shows, notified, notifications, t]);

  return { status, result, checkNow };
}
