import { useQuery } from '@tanstack/react-query';

import { useShowRepository } from '@/presentation/hooks/repositories-context';

import { queryKeys } from './query-keys';

const DETAIL_STALE_TIME_MS = 60 * 60_000;

function isValidShowId(showId: number): boolean {
  return Number.isInteger(showId) && showId > 0;
}

export function useShowDetail(showId: number) {
  const repository = useShowRepository();

  return useQuery({
    queryKey: queryKeys.shows.detail(showId),
    queryFn: () => repository.getById(showId),
    enabled: isValidShowId(showId),
    staleTime: DETAIL_STALE_TIME_MS,
  });
}

export function useShowEpisodes(showId: number) {
  const repository = useShowRepository();

  return useQuery({
    queryKey: queryKeys.shows.episodes(showId),
    queryFn: () => repository.getEpisodes(showId),
    enabled: isValidShowId(showId),
    staleTime: DETAIL_STALE_TIME_MS,
  });
}
