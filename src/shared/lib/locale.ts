const DEFAULT_COUNTRY = 'US';

/**
 * Deduce el país (`XX`) a partir del idioma del navegador.
 * `es-CO` → `CO`; si el locale no incluye región o `Intl.Locale` no está
 * disponible, se usa `US` como respaldo estable para la agenda de TVmaze.
 */
export function countryFromLocale(locale: string | undefined = getNavigatorLanguage()): string {
  if (locale === undefined || locale.length === 0) {
    return DEFAULT_COUNTRY;
  }

  try {
    const region = new Intl.Locale(locale).region;
    if (region !== undefined && /^[A-Za-z]{2}$/.test(region)) {
      return region.toUpperCase();
    }
  } catch {
    // Locale mal formado: se continúa con el respaldo.
  }

  return DEFAULT_COUNTRY;
}

export const SCHEDULE_COUNTRIES = [
  { code: 'CO', name: 'Colombia' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'MX', name: 'México' },
  { code: 'ES', name: 'España' },
  { code: 'AR', name: 'Argentina' },
  { code: 'BR', name: 'Brasil' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Perú' },
  { code: 'FR', name: 'Francia' },
] as const;

export type ScheduleCountryCode = (typeof SCHEDULE_COUNTRIES)[number]['code'];

const SCHEDULE_COUNTRY_CODES = new Set<string>(SCHEDULE_COUNTRIES.map(({ code }) => code));

export function isScheduleCountryCode(value: string | null | undefined): value is ScheduleCountryCode {
  return value !== null && value !== undefined && SCHEDULE_COUNTRY_CODES.has(value);
}

function getNavigatorLanguage(): string | undefined {
  if (typeof navigator === 'undefined') {
    return undefined;
  }

  return navigator.language;
}
