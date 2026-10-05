import type { ScheduleEntry } from '@/domain/entities/schedule-entry';
import type { Episode, Show } from '@/domain/entities/show';
import { stripHtml } from '@/shared/lib/strip-html';

import type {
  TvmazeEpisodeDto,
  TvmazeScheduleItemDto,
  TvmazeShowDto,
} from './schemas';

const MIN_VALID_YEAR = 1900;

export function parseYear(premiered: string | null | undefined): number | undefined {
  if (premiered === null || premiered === undefined || premiered.length < 4) {
    return undefined;
  }

  const year = Number.parseInt(premiered.slice(0, 4), 10);
  return Number.isInteger(year) && year >= MIN_VALID_YEAR ? year : undefined;
}

export function mapShow(dto: TvmazeShowDto): Show {
  const summary = stripHtml(dto.summary);

  return {
    id: dto.id,
    name: dto.name,
    genres: dto.genres,
    year: parseYear(dto.premiered),
    status: dto.status ?? undefined,
    rating: dto.rating?.average ?? undefined,
    imageUrl: dto.image?.medium ?? dto.image?.original ?? undefined,
    summary: summary.length > 0 ? summary : undefined,
  };
}

export function mapEpisode(dto: TvmazeEpisodeDto): Episode {
  return {
    id: dto.id,
    name: dto.name,
    season: dto.season ?? 0,
    number: dto.number ?? 0,
    airdate: dto.airdate ?? undefined,
  };
}

export function mapScheduleEntry(dto: TvmazeScheduleItemDto): ScheduleEntry {
  return {
    episodeId: dto.id,
    airdate: dto.airdate,
    airtime: dto.airtime ?? undefined,
    episodeName: dto.name,
    season: dto.season ?? 0,
    number: dto.number ?? 0,
    showId: dto.show.id,
    showName: dto.show.name,
    showImageUrl: dto.show.image?.medium ?? dto.show.image?.original ?? undefined,
    channel: dto.show.network?.name ?? dto.show.webChannel?.name ?? undefined,
  };
}
