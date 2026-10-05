import {
  DEFAULT_PREFERENCES,
  type PreferencesPatch,
  type UserPreferences,
} from '@/domain/entities/preferences';
import type { PreferencesRepository } from '@/domain/ports/preferences-repository';
import { isScheduleCountryCode } from '@/shared/lib/locale';

import type { EpixDatabase, PreferenceRecord } from './db';

export const PREFERENCES_KEY = 'app';

/** Clave del incremento anterior: se migra una sola vez al crear la fila local. */
export const LEGACY_COUNTRY_STORAGE_KEY = 'epix:country';

interface PreferencesRepositoryOptions {
  /** Reloj inyectable para pruebas; por defecto `new Date().toISOString()`. */
  now?: () => string;
  /** Almacén legado inyectable para pruebas; por defecto `window.localStorage`. */
  storage?: Pick<Storage, 'getItem'> | null;
}

function resolveStorage(
  storage: Pick<Storage, 'getItem'> | null | undefined,
): Pick<Storage, 'getItem'> | null {
  if (storage !== undefined) {
    return storage;
  }

  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function migratedCountry(
  storage: Pick<Storage, 'getItem'> | null,
): Pick<UserPreferences, 'country' | 'countrySource'> {
  const stored = storage?.getItem(LEGACY_COUNTRY_STORAGE_KEY) ?? null;

  if (isScheduleCountryCode(stored)) {
    return { country: stored, countrySource: 'manual' };
  }

  return { country: null, countrySource: null };
}

/** Convierte la fila Dexie (con metadatos locales) en la entidad de dominio. */
function toPreferences(record: PreferenceRecord): UserPreferences {
  return {
    theme: record.theme,
    language: record.language,
    favoriteGenres: record.favoriteGenres,
    maxAgeRating: record.maxAgeRating,
    country: record.country,
    countrySource: record.countrySource,
    notificationsEnabled: record.notificationsEnabled,
    telemetryEnabled: record.telemetryEnabled,
    updatedAt: record.updatedAt,
  };
}

/** Repositorio con un sembrado explícito para invocarlo fuera de `liveQuery`. */
export interface PreferencesRepositoryHandle extends PreferencesRepository {
  /** Crea la fila por defecto si no existe (idempotente). */
  ensureSeeded(): Promise<UserPreferences>;
}

export function createPreferencesRepository(
  db: EpixDatabase,
  options: PreferencesRepositoryOptions = {},
): PreferencesRepositoryHandle {
  const now = options.now ?? (() => new Date().toISOString());
  const storage = resolveStorage(options.storage);

  /** Fila inicial en memoria; no escribe para poder usarse dentro de `liveQuery`. */
  function createSeedRecord(): PreferenceRecord {
    return {
      key: PREFERENCES_KEY,
      ...DEFAULT_PREFERENCES,
      ...migratedCountry(storage),
      updatedAt: now(),
      syncStatus: 'pending',
    };
  }

  return {
    async ensureSeeded(): Promise<UserPreferences> {
      return db.transaction('rw', db.preferences, async () => {
        const existing = await db.preferences.get(PREFERENCES_KEY);
        if (existing !== undefined) {
          return toPreferences(existing);
        }

        const record = createSeedRecord();
        await db.preferences.put(record);
        return toPreferences(record);
      });
    },

    async get(): Promise<UserPreferences> {
      // Solo lectura: `liveQuery` prohíbe escrituras dentro de su transacción.
      const existing = await db.preferences.get(PREFERENCES_KEY);
      return toPreferences(existing ?? createSeedRecord());
    },

    async update(patch: PreferencesPatch): Promise<UserPreferences> {
      // Transacción de lectura-escritura: taps rápidos se serializan sin perder cambios.
      return db.transaction('rw', db.preferences, async () => {
        const current = (await db.preferences.get(PREFERENCES_KEY)) ?? createSeedRecord();
        const next: PreferenceRecord = {
          ...current,
          ...patch,
          updatedAt: now(),
          syncStatus: 'pending',
        };

        await db.preferences.put(next);
        return toPreferences(next);
      });
    },
  };
}
