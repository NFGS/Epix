export const queryKeys = {
  shows: {
    all: ['shows'] as const,
    search: (query: string) => ['shows', 'search', query] as const,
    detail: (showId: number) => ['shows', 'detail', showId] as const,
    episodes: (showId: number) => ['shows', 'episodes', showId] as const,
  },
  schedule: {
    all: ['schedule'] as const,
    byCountryAndDate: (country: string, date: string) => ['schedule', country, date] as const,
  },
} as const;
