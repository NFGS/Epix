import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback } from 'react';

import type { UserPreferences } from '@/domain/entities/preferences';
import type { PreferencesRepository } from '@/domain/ports/preferences-repository';

import { useDependencies } from './dependencies-context';

/** Preferencias del dispositivo en vivo (se actualizan al instante con IndexedDB). */
export function usePreferences(): UserPreferences | undefined {
  const { preferences } = useDependencies();
  return useLiveQuery(() => preferences.get(), [preferences], undefined);
}

/** Guarda cambios parciales (o funcionales) de preferencias; `updatedAt` lo sella el repositorio. */
export function useUpdatePreferences(): PreferencesRepository['update'] {
  const { preferences } = useDependencies();

  return useCallback(
    (patch: Parameters<PreferencesRepository['update']>[0]) => preferences.update(patch),
    [preferences],
  );
}
