import type { ScheduleEntry } from '@/domain/entities/schedule-entry';

export interface HourGroup {
  /** Hora `HH:mm` o `null` cuando la API no informa la hora de emisión. */
  hour: string | null;
  entries: ScheduleEntry[];
}

function timeKey(entry: ScheduleEntry): string {
  return entry.airtime?.slice(0, 5) ?? '';
}

function compareEntries(a: ScheduleEntry, b: ScheduleEntry): number {
  const dateComparison = a.airdate.localeCompare(b.airdate);
  if (dateComparison !== 0) {
    return dateComparison;
  }

  const aTime = timeKey(a);
  const bTime = timeKey(b);
  if (aTime === '' && bTime !== '') {
    return 1;
  }
  if (aTime !== '' && bTime === '') {
    return -1;
  }

  const timeComparison = aTime.localeCompare(bTime);
  if (timeComparison !== 0) {
    return timeComparison;
  }

  return a.showName.localeCompare(b.showName);
}

/** Agrupa la agenda por hora de emisión; las entradas sin hora van al final. */
export function groupByHour(entries: readonly ScheduleEntry[]): HourGroup[] {
  const sorted = [...entries].sort(compareEntries);
  const byHour = new Map<string, ScheduleEntry[]>();

  for (const entry of sorted) {
    const key = timeKey(entry);
    const bucket = byHour.get(key);
    if (bucket === undefined) {
      byHour.set(key, [entry]);
    } else {
      bucket.push(entry);
    }
  }

  return [...byHour.entries()].map(([hour, hourEntries]) => ({
    hour: hour === '' ? null : hour,
    entries: hourEntries,
  }));
}
