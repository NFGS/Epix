import { createContext, useContext } from 'react';

import type { ScheduleRepository } from '@/domain/ports/schedule-repository';
import type { ShowRepository } from '@/domain/ports/show-repository';

export interface Repositories {
  shows: ShowRepository;
  schedule: ScheduleRepository;
}

export const RepositoriesContext = createContext<Repositories | null>(null);

export function useRepositories(): Repositories {
  const value = useContext(RepositoriesContext);

  if (value === null) {
    throw new Error('useRepositories debe usarse dentro de <RepositoriesContext.Provider>.');
  }

  return value;
}

export function useShowRepository(): ShowRepository {
  return useRepositories().shows;
}

export function useScheduleRepository(): ScheduleRepository {
  return useRepositories().schedule;
}
