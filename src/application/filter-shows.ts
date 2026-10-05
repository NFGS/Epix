import { isAllowedByAge } from '@/domain/content-rating';
import type { AgeRating } from '@/domain/entities/preferences';

export interface ShowFilters {
  favoriteGenres: readonly string[];
  maxAgeRating: AgeRating;
}

export interface FilteredItems<T> {
  visible: T[];
  hiddenCount: number;
}

/**
 * Aplica las preferencias de contenido (RF-05) a una lista con géneros (series o agenda):
 * - Géneros favoritos: si la lista no está vacía, la serie debe compartir al menos uno.
 * - Edad: la estimación por géneros no puede superar el máximo configurado.
 * Ambos filtros son acumulativos; `hiddenCount` permite avisar que se ocultaron resultados.
 */
export function filterShows<T extends { genres: readonly string[] }>(
  items: readonly T[],
  filters: ShowFilters,
): FilteredItems<T> {
  const visible: T[] = [];
  let hiddenCount = 0;

  for (const item of items) {
    if (
      matchesGenres(item.genres, filters.favoriteGenres) &&
      isAllowedByAge(item.genres, filters.maxAgeRating)
    ) {
      visible.push(item);
    } else {
      hiddenCount += 1;
    }
  }

  return { visible, hiddenCount };
}

function matchesGenres(genres: readonly string[], favoriteGenres: readonly string[]): boolean {
  if (favoriteGenres.length === 0) {
    return true;
  }

  return genres.some((genre) => favoriteGenres.includes(genre));
}
