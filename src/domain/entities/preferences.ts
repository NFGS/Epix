/**
 * Preferencias del dispositivo (tabla local `preferences`).
 * El dominio no conoce Dexie, React ni Supabase: solo describe el contrato.
 */

/** Clasificaciones TV usadas por la estimación de edad de Epix (ver `domain/content-rating`). */
export type AgeRating = 'TV-Y' | 'TV-Y7' | 'TV-G' | 'TV-PG' | 'TV-14' | 'TV-MA';

export type PreferenceTheme = 'light' | 'dark' | 'system';
export type PreferenceLanguage = 'es' | 'en';
export type CountrySource = 'gps' | 'manual';

export interface UserPreferences {
  theme: PreferenceTheme;
  language: PreferenceLanguage;
  favoriteGenres: string[];
  maxAgeRating: AgeRating;
  country: string | null;
  countrySource: CountrySource | null;
  notificationsEnabled: boolean;
  telemetryEnabled: boolean;
  updatedAt: string;
}

/** Cambios parciales permitidos sobre las preferencias (el `updatedAt` lo sella el repositorio). */
export type PreferencesPatch = Partial<Omit<UserPreferences, 'updatedAt'>>;

/** Valores iniciales alineados con `docs/modelo-datos.md` §2. */
export const DEFAULT_PREFERENCES: Omit<UserPreferences, 'updatedAt'> = {
  theme: 'system',
  language: 'es',
  favoriteGenres: [],
  maxAgeRating: 'TV-14',
  country: null,
  countrySource: null,
  notificationsEnabled: false,
  telemetryEnabled: false,
};
