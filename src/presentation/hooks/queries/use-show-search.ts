import { useQuery } from '@tanstack/react-query';

import { MIN_SEARCH_LENGTH, searchShows } from '@/application/use-cases/search-shows';
import { useShowRepository } from '@/presentation/hooks/repositories-context';

import { queryKeys } from './query-keys';

const SEARCH_STALE_TIME_MS = 60_000;
const SEARCH_GC_TIME_MS = 30 * 60_000;

export function useShowSearch(query: string) {
  const repository = useShowRepository();
  const normalizedQuery = query.trim();

  return useQuery({
    queryKey: queryKeys.shows.search(normalizedQuery),
    queryFn: () => searchShows(repository, normalizedQuery),
    enabled: normalizedQuery.length >= MIN_SEARCH_LENGTH,
    staleTime: SEARCH_STALE_TIME_MS,
    gcTime: SEARCH_GC_TIME_MS,
  });
}
