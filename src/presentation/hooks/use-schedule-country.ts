import { useCallback } from 'react';

import type { CountrySource } from '@/domain/entities/preferences';
import {
  countryFromLocale,
  isScheduleCountryCode,
  type ScheduleCountryCode,
} from '@/shared/lib/locale';

import { usePreferences, useUpdatePreferences } from './use-preferences';

const FALLBACK_COUNTRY: ScheduleCountryCode = 'US';
const ISO_COUNTRY_PATTERN = /^[A-Za-z]{2}$/;

function detectedCountry(): ScheduleCountryCode {
  const detected = countryFromLocale();
  return isScheduleCountryCode(detected) ? detected : FALLBACK_COUNTRY;
}

/**
 * Acepta cualquier ISO 3166-1 alpha-2 guardado: el GPS puede resolver países
 * fuera de la lista curada del selector y la agenda de TVmaze los soporta.
 */
function storedCountry(value: string | null): string | null {
  return value !== null && ISO_COUNTRY_PATTERN.test(value) ? value.toUpperCase() : null;
}

/**
 * País de la agenda persistido en `preferences.country` (IndexedDB).
 * Si aún no hay país guardado se detecta por idioma; al elegir uno en el
 * selector se guarda con `countrySource: 'manual'`, y el flujo de GPS
 * (`useRequestLocation`) lo guarda con `countrySource: 'gps'`.
 */
export function useScheduleCountry() {
  const preferences = usePreferences();
  const updatePreferences = useUpdatePreferences();

  const stored = preferences?.country ?? null;
  const country: string = storedCountry(stored) ?? detectedCountry();
  const countrySource: CountrySource | null = preferences?.countrySource ?? null;

  const setCountry = useCallback(
    (next: ScheduleCountryCode) => {
      void updatePreferences({ country: next, countrySource: 'manual' });
    },
    [updatePreferences],
  );

  const setCountrySource = useCallback(
    (source: CountrySource) => {
      void updatePreferences({ countrySource: source });
    },
    [updatePreferences],
  );

  return { country, countrySource, setCountry, setCountrySource };
}
