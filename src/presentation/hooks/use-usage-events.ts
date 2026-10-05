import { useLiveQuery } from 'dexie-react-hooks';

import type { UsageEvent } from '@/domain/entities/usage-event';

import { useDependencies } from './dependencies-context';

/** Eventos de telemetría local en vivo, del más reciente al más antiguo. */
export function useUsageEvents(): UsageEvent[] | undefined {
  const { usageEvents } = useDependencies();
  return useLiveQuery(() => usageEvents.list(), [usageEvents], undefined);
}
