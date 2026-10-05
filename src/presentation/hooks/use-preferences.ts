import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback } from 'react';

import type { PreferencesPatch, UserPreferences } from '@/domain/entities/preferences';

import { useDependencies } from './dependencies-context';

/** Preferencias del dispositivo en vivo (se actualizan al instante con IndexedDB). */
export function usePreferences(): UserPreferences | undefined {
  const { preferences } = useDependencies();
  return useLiveQuery(() => preferences.get(), [preferences], undefined);
}

/** Guarda cambios parciales de preferencias; `updatedAt` lo sella el repositorio. */
export function useUpdatePreferences(): (patch: PreferencesPatch) => Promise<UserPreferences> {
  const { preferences } = useDependencies();

  return useCallback((patch: PreferencesPatch) => preferences.update(patch), [preferences]);
}
