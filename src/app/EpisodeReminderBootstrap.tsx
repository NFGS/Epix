import { useEffect } from 'react';

import {
  isReminderRunDue,
  readLastReminderRun,
  useEpisodeReminders,
  writeLastReminderRun,
} from '@/presentation/hooks/use-episode-reminders';

/**
 * Dispara los recordatorios de episodios al abrir la app, como máximo una vez
 * por hora (marca persistida). No renderiza nada.
 */
export function EpisodeReminderBootstrap() {
  const { checkNow } = useEpisodeReminders();

  useEffect(() => {
    const lastRunAt = readLastReminderRun();
    if (!isReminderRunDue(Date.now(), lastRunAt)) {
      return;
    }

    writeLastReminderRun(Date.now());
    void checkNow();
  }, [checkNow]);

  return null;
}
