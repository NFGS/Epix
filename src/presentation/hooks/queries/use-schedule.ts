import { useQuery } from '@tanstack/react-query';

import { useScheduleRepository } from '@/presentation/hooks/repositories-context';

import { queryKeys } from './query-keys';

const SCHEDULE_STALE_TIME_MS = 60 * 60_000;

function isCountryCode(country: string): boolean {
  return /^[A-Za-z]{2}$/.test(country);
}

function isIsoDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function useSchedule(country: string, date: string) {
  const repository = useScheduleRepository();

  return useQuery({
    queryKey: queryKeys.schedule.byCountryAndDate(country, date),
    queryFn: () => repository.getByCountryAndDate(country, date),
    enabled: isCountryCode(country) && isIsoDate(date),
    staleTime: SCHEDULE_STALE_TIME_MS,
  });
}
