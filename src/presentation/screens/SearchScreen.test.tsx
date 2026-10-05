import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { ScheduleRepository } from '@/domain/ports/schedule-repository';
import type { ShowRepository } from '@/domain/ports/show-repository';
import { RepositoriesContext, type Repositories } from '@/presentation/hooks/repositories-context';
import { I18nProvider } from '@/shared/i18n/I18nProvider';

import { SearchScreen } from './SearchScreen';

function createRepositories(searchResults: Awaited<ReturnType<ShowRepository['search']>>) {
  const search = vi.fn(async () => searchResults);
  const shows: ShowRepository = {
    search,
    getById: vi.fn(async () => null),
    getEpisodes: vi.fn(async () => []),
  };
  const schedule: ScheduleRepository = {
    getByCountryAndDate: vi.fn(async () => []),
  };
  const repositories: Repositories = { shows, schedule };
  return { repositories, search };
}

function renderSearch(repositories: Repositories) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RepositoriesContext.Provider value={repositories}>
        <I18nProvider>
          <MemoryRouter>
            <SearchScreen />
          </MemoryRouter>
        </I18nProvider>
      </RepositoriesContext.Provider>
    </QueryClientProvider>,
  );
}

describe('SearchScreen', () => {
  it('no consulta TVmaze con menos de 3 caracteres', async () => {
    const { repositories, search } = createRepositories([]);
    renderSearch(repositories);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ab' } });

    expect(await screen.findByText(/sigue escribiendo/i)).toBeInTheDocument();
    expect(search).not.toHaveBeenCalled();
  });

  it('muestra el estado vacío repitiendo la consulta cuando no hay resultados', async () => {
    const { repositories, search } = createRepositories([]);
    renderSearch(repositories);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzzz' } });

    expect(
      await screen.findByText('Sin resultados para «zzzz»', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(search).toHaveBeenCalledWith('zzzz');
  });

  it('renderiza las tarjetas y el contador accesible con resultados', async () => {
    const { repositories } = createRepositories([
      { id: 1, name: 'Girls', genres: ['Drama'], year: 2012, rating: 7.2 },
    ]);
    renderSearch(repositories);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'girls' } });

    expect(
      await screen.findByRole('link', { name: /girls/i }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 resultado para «girls»/)).toBeInTheDocument();
  });
});
