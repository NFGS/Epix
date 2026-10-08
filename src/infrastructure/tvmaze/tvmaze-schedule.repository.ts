import type { ScheduleEntry } from '@/domain/entities/schedule-entry';
import type { ScheduleRepository } from '@/domain/ports/schedule-repository';

import { createTvmazeClient, type TvmazeClient } from './client';
import { mapScheduleEntry } from './mappers';
import { tvmazeScheduleResponseSchema } from './schemas';

export function createTvmazeScheduleRepository(
  // La agenda se sirve desde el proxy de mismo origen (`/api/schedule`), cacheado
  // en el CDN; el resto de endpoints siguen contra `api.tvmaze.com`.
  client: TvmazeClient = createTvmazeClient({ baseUrl: '' }),
): ScheduleRepository {
  return {
    async getByCountryAndDate(country: string, date: string): Promise<ScheduleEntry[]> {
      // P-13: el país se canonicaliza a mayúsculas ISO en el borde para que
      // `co`, `Co` y `CO` compartan la misma URL y, por tanto, la misma clave
      // de caché (TanStack Query + Workbox + CDN del proxy).
      const params = new URLSearchParams({ country: country.trim().toUpperCase(), date });
      const dtos = await client.get(
        `/api/schedule?${params.toString()}`,
        tvmazeScheduleResponseSchema,
      );

      return dtos.map(mapScheduleEntry);
    },
  };
}
