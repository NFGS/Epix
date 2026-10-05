import type { Episode, Show } from '@/domain/entities/show';
import type { ShowRepository } from '@/domain/ports/show-repository';

import { createTvmazeClient, TvmazeNotFoundError, type TvmazeClient } from './client';
import { mapEpisode, mapShow } from './mappers';
import {
  tvmazeEpisodeListSchema,
  tvmazeSearchResponseSchema,
  tvmazeShowSchema,
  tvmazeShowWithNextEpisodeSchema,
} from './schemas';

export function createTvmazeShowRepository(
  client: TvmazeClient = createTvmazeClient(),
): ShowRepository {
  return {
    async search(query: string): Promise<Show[]> {
      const results = await client.get(
        `/search/shows?q=${encodeURIComponent(query)}`,
        tvmazeSearchResponseSchema,
      );

      return results.map(({ show }) => mapShow(show));
    },

    async getById(id: number): Promise<Show | null> {
      try {
        const dto = await client.get(`/shows/${id}`, tvmazeShowSchema);
        return mapShow(dto);
      } catch (error) {
        if (error instanceof TvmazeNotFoundError) {
          return null;
        }

        throw error;
      }
    },

    async getEpisodes(showId: number): Promise<Episode[]> {
      const dtos = await client.get(`/shows/${showId}/episodes`, tvmazeEpisodeListSchema);
      return dtos.map(mapEpisode);
    },

    async getNextEpisode(showId: number): Promise<Episode | null> {
      try {
        const dto = await client.get(
          `/shows/${showId}?embed=nextepisode`,
          tvmazeShowWithNextEpisodeSchema,
        );
        const next = dto._embedded?.nextepisode ?? null;
        return next === null ? null : mapEpisode(next);
      } catch (error) {
        if (error instanceof TvmazeNotFoundError) {
          return null;
        }

        throw error;
      }
    },
  };
}
