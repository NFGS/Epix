import type { ScheduleEntry } from '@/domain/entities/schedule-entry';

export interface ScheduleRepository {
  getByCountryAndDate(country: string, date: string): Promise<ScheduleEntry[]>;
}
