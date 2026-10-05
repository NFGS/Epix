import type { AgeRating } from './entities/preferences';

/**
 * Estimación de edad por géneros (dominio puro).
 *
 * **Por qué existe:** TVmaze **no publica** clasificación por edad (TV-Y…TV-MA) para sus
 * series. Epix necesita un filtro de contenido para RF-05, así que la estima a partir de
 * los géneros que TVmaze sí expone. Es una heurística transparente y honesta: la UI lo
 * advierte al usuario. Si algún día TVmaze publica la clasificación real, basta con
 * sustituir `estimateShowAge` por el dato oficial sin tocar el resto del sistema.
 *
 * Regla: el nivel estimado de una serie es el **máximo** entre los niveles de sus géneros
 * (una serie hereda el contenido más maduro de cualquiera de sus etiquetas).
 */

/** Orden creciente de madurez; el índice es el rango comparable. */
export const AGE_RATINGS: readonly AgeRating[] = [
  'TV-Y',
  'TV-Y7',
  'TV-G',
  'TV-PG',
  'TV-14',
  'TV-MA',
];

/** Sin géneros, TVmaze no da contexto: se asume contenido infantil moderado. */
export const EMPTY_GENRES_RATING: AgeRating = 'TV-Y7';

/** Género no catalogado: se asume nivel adolescente para no sobreexponer contenido. */
export const UNKNOWN_GENRE_RATING: AgeRating = 'TV-14';

/**
 * Nivel estimado por género de TVmaze (la clave debe coincidir exactamente con la API).
 * Orden alfabético: es el mismo orden en que se ofrecen los chips en Perfil.
 */
export const GENRE_AGE_RATINGS: Readonly<Record<string, AgeRating>> = {
  Action: 'TV-PG',
  Adventure: 'TV-PG',
  Anime: 'TV-Y7',
  Children: 'TV-Y',
  Comedy: 'TV-PG',
  Crime: 'TV-14',
  Drama: 'TV-14',
  Espionage: 'TV-14',
  Family: 'TV-G',
  Fantasy: 'TV-PG',
  Food: 'TV-G',
  'Game Show': 'TV-PG',
  History: 'TV-14',
  Horror: 'TV-MA',
  Legal: 'TV-14',
  Medical: 'TV-14',
  Music: 'TV-PG',
  Mystery: 'TV-14',
  Nature: 'TV-G',
  Reality: 'TV-PG',
  Romance: 'TV-PG',
  'Science-Fiction': 'TV-14',
  Sports: 'TV-PG',
  Supernatural: 'TV-14',
  'Talk Show': 'TV-PG',
  Thriller: 'TV-14',
  Travel: 'TV-G',
  War: 'TV-MA',
  Western: 'TV-14',
};

/** Géneros ofrecidos en el selector de Perfil (claves reales de TVmaze). */
export const TVMAZE_GENRES: readonly string[] = Object.keys(GENRE_AGE_RATINGS);

/** Rango numérico de una clasificación (mayor = más madura). */
export function ageRatingRank(rating: AgeRating): number {
  return AGE_RATINGS.indexOf(rating);
}

/** Estima la clasificación de una serie combinando el nivel de todos sus géneros. */
export function estimateShowAge(genres: readonly string[]): AgeRating {
  if (genres.length === 0) {
    return EMPTY_GENRES_RATING;
  }

  let highestRank = 0;
  for (const genre of genres) {
    const rating = GENRE_AGE_RATINGS[genre] ?? UNKNOWN_GENRE_RATING;
    highestRank = Math.max(highestRank, ageRatingRank(rating));
  }

  return AGE_RATINGS[highestRank];
}

/** `true` si la estimación de la serie entra dentro del máximo permitido. */
export function isAllowedByAge(genres: readonly string[], maxAgeRating: AgeRating): boolean {
  return ageRatingRank(estimateShowAge(genres)) <= ageRatingRank(maxAgeRating);
}
