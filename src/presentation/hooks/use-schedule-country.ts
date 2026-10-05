import { useCallback, useState } from 'react';

import {
  countryFromLocale,
  isScheduleCountryCode,
  type ScheduleCountryCode,
} from '@/shared/lib/locale';

export const SCHEDULE_COUNTRY_STORAGE_KEY = 'epix:country';
const FALLBACK_COUNTRY: ScheduleCountryCode = 'US';

function readStoredCountry(): ScheduleCountryCode {
  try {
    const stored = window.localStorage.getItem(SCHEDULE_COUNTRY_STORAGE_KEY);
    if (isScheduleCountryCode(stored)) {
      return stored;
    }
  } catch {
    // Almacenamiento no disponible: se usa la detección por idioma.
  }

  const detected = countryFromLocale();
  return isScheduleCountryCode(detected) ? detected : FALLBACK_COUNTRY;
}

/** País de la agenda persistido en `localStorage` (`epix:country`). */
export function useScheduleCountry() {
  const [country, setCountryState] = useState<ScheduleCountryCode>(readStoredCountry);

  const setCountry = useCallback((next: ScheduleCountryCode) => {
    setCountryState(next);
    try {
      window.localStorage.setItem(SCHEDULE_COUNTRY_STORAGE_KEY, next);
    } catch {
      // Sin persistencia disponible: el cambio sigue activo en memoria.
    }
  }, []);

  return { country, setCountry };
}
