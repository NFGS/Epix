import { useMemo, useState, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { createTvmazeScheduleRepository } from '@/infrastructure/tvmaze/tvmaze-schedule.repository';
import { createTvmazeShowRepository } from '@/infrastructure/tvmaze/tvmaze-show.repository';
import { RepositoriesContext, type Repositories } from '@/presentation/hooks/repositories-context';
import { I18nProvider } from '@/shared/i18n/I18nProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider } from '@/presentation/hooks/ThemeProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  const [repositories] = useState<Repositories>(() => ({
    shows: createTvmazeShowRepository(),
    schedule: createTvmazeScheduleRepository(),
  }));

  const repositoriesValue = useMemo(() => repositories, [repositories]);

  return (
    <QueryClientProvider client={queryClient}>
      <RepositoriesContext.Provider value={repositoriesValue}>
        <ThemeProvider>
          <I18nProvider>
            <BrowserRouter>{children}</BrowserRouter>
          </I18nProvider>
        </ThemeProvider>
      </RepositoriesContext.Provider>
    </QueryClientProvider>
  );
}
