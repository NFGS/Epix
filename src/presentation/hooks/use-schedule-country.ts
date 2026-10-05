import { useCallback } from 'react';

import {
  countryFromLocale,
  isScheduleCountryCode,
  type ScheduleCountryCode,
} from '@/shared/lib/locale';

import { usePreferences, useUpdatePreferences } from './use-preferences';

const FALLBACK_COUNTRY: ScheduleCountryCode = 'US';

function detectedCountry(): ScheduleCountryCode {
  const detected = countryFromLocale();
  return isScheduleCountryCode(detected) ? detected : FALLBACK_COUNTRY;
}

/**
 * País de la agenda persistido en `preferences.country` (IndexedDB).
 * Si aún no hay país guardado se detecta por idioma; al elegir uno en el
 * selector se guarda con `countrySource: 'manual'`.
 */
export function useScheduleCountry() {
  const preferences = usePreferences();
  const updatePreferences = useUpdatePreferences();

  const stored = preferences?.country ?? null;
  const country: ScheduleCountryCode = isScheduleCountryCode(stored) ? stored : detectedCountry();

  const setCountry = useCallback(
    (next: ScheduleCountryCode) => {
      void updatePreferences({ country: next, countrySource: 'manual' });
    },
    [updatePreferences],
  );

  return { country, setCountry };
}
