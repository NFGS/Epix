import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { ScheduleRepository } from '@/domain/ports/schedule-repository';
import type { ShowRepository } from '@/domain/ports/show-repository';
import { DependenciesContext } from '@/presentation/hooks/dependencies-context';
import { RepositoriesContext, type Repositories } from '@/presentation/hooks/repositories-context';
import { I18nProvider } from '@/shared/i18n/I18nProvider';
import { createTestDependencies, type TestDependencies } from '@/test/test-dependencies';

import { SearchScreen } from './SearchScreen';

function createRepositories(
  searchResults: Awaited<ReturnType<ShowRepository['search']>>,
  searchImpl?: ShowRepository['search'],
) {
  const search = vi.fn(searchImpl ?? (async () => searchResults));
  const shows: ShowRepository = {
    search,
    getById: vi.fn(async () => null),
    getEpisodes: vi.fn(async () => []),
    getNextEpisode: vi.fn(async () => null),
  };
  const schedule: ScheduleRepository = {
    getByCountryAndDate: vi.fn(async () => []),
  };
  const repositories: Repositories = { shows, schedule };
  return { repositories, search };
}

function renderSearch(repositories: Repositories, dependencies: TestDependencies) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RepositoriesContext.Provider value={repositories}>
        <DependenciesContext.Provider value={dependencies}>
          <I18nProvider>
            <MemoryRouter>
              <SearchScreen />
            </MemoryRouter>
          </I18nProvider>
        </DependenciesContext.Provider>
      </RepositoriesContext.Provider>
    </QueryClientProvider>,
  );
}

describe('SearchScreen', () => {
  it('no consulta TVmaze con menos de 3 caracteres', async () => {
    const { repositories, search } = createRepositories([]);
    renderSearch(repositories, createTestDependencies());

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ab' } });

    expect(await screen.findByText(/sigue escribiendo/i)).toBeInTheDocument();
    expect(search).not.toHaveBeenCalled();
  });

  it('muestra el estado vacío repitiendo la consulta cuando no hay resultados', async () => {
    const { repositories, search } = createRepositories([]);
    renderSearch(repositories, createTestDependencies());

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
    renderSearch(repositories, createTestDependencies());

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'girls' } });

    expect(
      await screen.findByRole('link', { name: /girls/i }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 resultado para «girls»/)).toBeInTheDocument();
  });

  it('registra la búsqueda asentada una sola vez con su número de resultados', async () => {
    const { repositories } = createRepositories([
      { id: 1, name: 'Girls', genres: ['Drama'], year: 2012, rating: 7.2 },
    ]);
    const dependencies = createTestDependencies();
    const addSearch = vi.spyOn(dependencies.history, 'addSearch');

    renderSearch(repositories, dependencies);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'girls' } });

    await screen.findByRole('link', { name: /girls/i }, { timeout: 3000 });
    await waitFor(() => {
      expect(addSearch).toHaveBeenCalledTimes(1);
    });
    expect(addSearch.mock.calls[0][0]).toMatchObject({
      type: 'search',
      query: 'girls',
      resultCount: 1,
    });
  });

  it('pagina los resultados: 24 al inicio y 48 tras «Mostrar más»', async () => {
    const results = Array.from({ length: 60 }, (_, index) => ({
      id: index + 1,
      name: `Serie ${String(index + 1)}`,
      genres: ['Drama'],
      year: 2020,
      rating: 7,
    }));
    const { repositories } = createRepositories(results);
    const { container } = renderSearch(repositories, createTestDependencies());

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'serie' } });

    expect(
      await screen.findByText('60 resultados para «serie»', {}, { timeout: 3000 }),
    ).toBeInTheDocument();

    const cardCount = () => container.querySelectorAll('a[href^="/shows/"]').length;
    expect(cardCount()).toBe(24);

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar más' }));
    expect(cardCount()).toBe(48);
  });

  it('muestra ErrorState y «Reintentar» dispara refetch hasta recuperarse (R-07)', async () => {
    const search = vi
      .fn<ShowRepository['search']>()
      .mockRejectedValueOnce(new Error('sin red'))
      .mockResolvedValue([{ id: 1, name: 'Girls', genres: ['Drama'], year: 2012, rating: 7.2 }]);
    const { repositories } = createRepositories([], search);
    renderSearch(repositories, createTestDependencies());

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'girls' } });

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('No pudimos consultar TVmaze. Revisa tu conexión e inténtalo de nuevo.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('link', { name: /girls/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(search).toHaveBeenCalledTimes(2);
    });
  });
});
