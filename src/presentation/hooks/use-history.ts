import { useLiveQuery } from 'dexie-react-hooks';

import type { HistoryEntry, SearchHistoryEntry } from '@/domain/entities/history-entry';

import { useDependencies } from './dependencies-context';

export interface HistoryData {
  views: HistoryEntry[] | undefined;
  searches: SearchHistoryEntry[] | undefined;
}

/** Historial local en vivo: vistas de series y búsquedas recientes. */
export function useHistory(): HistoryData {
  const { history } = useDependencies();

  const entries = useLiveQuery(() => history.list(), [history], undefined);
  const searches = useLiveQuery(() => history.listSearches(), [history], undefined);

  return {
    views: entries?.filter((entry) => entry.type === 'view'),
    searches,
  };
}
