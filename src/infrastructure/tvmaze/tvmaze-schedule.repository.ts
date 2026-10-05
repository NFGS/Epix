import type { ScheduleEntry } from '@/domain/entities/schedule-entry';
import type { ScheduleRepository } from '@/domain/ports/schedule-repository';

import { createTvmazeClient, type TvmazeClient } from './client';
import { mapScheduleEntry } from './mappers';
import { tvmazeScheduleResponseSchema } from './schemas';

export function createTvmazeScheduleRepository(
  client: TvmazeClient = createTvmazeClient(),
): ScheduleRepository {
  return {
    async getByCountryAndDate(country: string, date: string): Promise<ScheduleEntry[]> {
      const params = new URLSearchParams({ country, date });
      const dtos = await client.get(
        `/schedule?${params.toString()}`,
        tvmazeScheduleResponseSchema,
      );

      return dtos.map(mapScheduleEntry);
    },
  };
}
