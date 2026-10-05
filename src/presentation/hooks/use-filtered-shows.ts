import { useMemo } from 'react';

import { filterShows, type FilteredItems } from '@/application/filter-shows';

import { usePreferences } from './use-preferences';

/**
 * Aplica las preferencias de contenido a una lista genérica con `genres`.
 * Mientras las preferencias cargan no se oculta nada (evita parpadeos); al
 * resolverse, el filtrado es reactivo a cualquier cambio en Perfil.
 */
export function useFilteredShows<T extends { genres: readonly string[] }>(
  items: readonly T[],
): FilteredItems<T> {
  const preferences = usePreferences();

  return useMemo(() => {
    if (preferences === undefined) {
      return { visible: [...items], hiddenCount: 0 };
    }

    return filterShows(items, {
      favoriteGenres: preferences.favoriteGenres,
      maxAgeRating: preferences.maxAgeRating,
    });
  }, [items, preferences]);
}
