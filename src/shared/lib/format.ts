/** Reemplaza marcadores `{clave}` de una plantilla de i18n. */
export function formatTemplate(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

export type RelativeDateLanguage = 'es' | 'en';

export interface RelativeDateLabels {
  today: string;
  yesterday: string;
}

const MONTHS: Record<RelativeDateLanguage, readonly string[]> = {
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Fecha relativa para el historial: «Hoy 14:32», «Ayer» o «12 sep».
 * Añade el año cuando la fecha no es del año en curso.
 */
export function formatRelativeDate(
  isoTimestamp: string,
  labels: RelativeDateLabels,
  options: { now?: Date; language?: RelativeDateLanguage } = {},
): string {
  const date = new Date(isoTimestamp);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = options.now ?? new Date();
  const language = options.language ?? 'es';

  if (isSameDay(date, now)) {
    return `${labels.today} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, yesterday)) {
    return labels.yesterday;
  }

  const day = date.getDate();
  const month = MONTHS[language][date.getMonth()];
  const formatted = language === 'en' ? `${month} ${day}` : `${day} ${month}`;

  return date.getFullYear() === now.getFullYear()
    ? formatted
    : `${formatted} ${date.getFullYear()}`;
}

/** Fecha y hora absolutas (para la última sincronización). */
export function formatDateTime(isoTimestamp: string, language: RelativeDateLanguage): string {
  const date = new Date(isoTimestamp);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
