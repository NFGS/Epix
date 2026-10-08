/**
 * P-10: ventana de fechas aceptadas para un aviso de estreno.
 *
 * TVmaze publica `airdate` como la fecha de calendario de la emisión original
 * (sin hora ni zona horaria). El cron corre en UTC y el público objetivo de
 * Epix está en UTC-5 (Colombia): a las 02:00 UTC el «hoy» local todavía es el
 * día anterior en UTC. Para no perder un estreno (ni mandarlo tarde), una
 * corrida acepta la fecha de HOY en UTC-5 y la de AYER en UTC-5.
 *
 * La ventana es determinista por día: dos corridas en días UTC distintos
 * pueden cubrir la misma fecha cerca de la medianoche, pero el cron está
 * pensado para ejecutarse UNA vez al día (limitación documentada de dedupe).
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const UTC_MINUS_FIVE_MS = 5 * 60 * 60 * 1000;

export interface ScheduleDateWindow {
  /** Fecha de «hoy» en UTC-5 (`YYYY-MM-DD`). */
  today: string;
  /** Fecha de «ayer» en UTC-5 (`YYYY-MM-DD`). */
  yesterday: string;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function isoDay(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

export function scheduleDateWindow(now: Date = new Date()): ScheduleDateWindow {
  const local = new Date(now.getTime() - UTC_MINUS_FIVE_MS);
  const yesterday = new Date(local.getTime() - ONE_DAY_MS);

  return {
    today: isoDay(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()),
    yesterday: isoDay(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate()),
  };
}

export function isAirdateInWindow(airdate: string, now: Date = new Date()): boolean {
  const window = scheduleDateWindow(now);
  return airdate === window.today || airdate === window.yesterday;
}
