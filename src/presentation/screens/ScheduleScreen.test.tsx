import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { ResolveCountryFn } from '@/application/ports/location';
import type { ScheduleEntry } from '@/domain/entities/schedule-entry';
import type { Show } from '@/domain/entities/show';
import { GeoError } from '@/infrastructure/geo/geolocation';
import { DependenciesContext } from '@/presentation/hooks/dependencies-context';
import { RepositoriesContext, type Repositories } from '@/presentation/hooks/repositories-context';
import { I18nProvider } from '@/shared/i18n/I18nProvider';
import { createTestDependencies, type TestDependencies } from '@/test/test-dependencies';

import { ScheduleScreen } from './ScheduleScreen';

const ENTRY: ScheduleEntry = {
  episodeId: 1,
  airdate: '2026-10-05',
  episodeName: 'Pilot',
  season: 1,
  number: 1,
  airtime: '20:00',
  showId: 7,
  showName: 'Girls',
  genres: ['Drama'],
};

function createRepositories(
  getByCountryAndDate: () => Promise<ScheduleEntry[]> = async () => [],
): Repositories {
  return {
    shows: {
      search: vi.fn(async (): Promise<Show[]> => []),
      getById: vi.fn(async (): Promise<Show> => {
        throw new Error('repositorio de series no usado en la Agenda');
      }),
      getEpisodes: vi.fn(async () => []),
      getNextEpisode: vi.fn(async () => null),
    },
    schedule: {
      getByCountryAndDate: vi.fn(getByCountryAndDate),
    },
  };
}

function renderSchedule(
  dependencies: TestDependencies,
  repositories: Repositories = createRepositories(),
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RepositoriesContext.Provider value={repositories}>
        <DependenciesContext.Provider value={dependencies}>
          <I18nProvider>
            <MemoryRouter>
              <ScheduleScreen />
            </MemoryRouter>
          </I18nProvider>
        </DependenciesContext.Provider>
      </RepositoriesContext.Provider>
    </QueryClientProvider>,
  );

  return dependencies;
}

describe('ScheduleScreen · ubicación', () => {
  it('muestra el CTA de ubicación cuando el país no proviene del GPS', async () => {
    renderSchedule(createTestDependencies());

    expect(await screen.findByRole('button', { name: /usar mi ubicación/i })).toBeInTheDocument();
    expect(
      screen.getByText('Activa tu ubicación para ver la programación de tu país'),
    ).toBeInTheDocument();
  });

  it('muestra el chip de GPS y oculta el CTA cuando el país es GPS', async () => {
    const dependencies = createTestDependencies();
    await dependencies.preferences.update({ country: 'CO', countrySource: 'gps' });
    renderSchedule(dependencies);

    expect(await screen.findByText('Según tu ubicación · CO')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /usar mi ubicación/i })).not.toBeInTheDocument();
  });

  it('informa el error de soporte cuando el navegador no tiene geolocalización', async () => {
    const user = userEvent.setup();
    const resolveCountry: ResolveCountryFn = async () => {
      throw new GeoError('unsupported');
    };
    renderSchedule({ ...createTestDependencies(), resolveCountry });

    await user.click(await screen.findByRole('button', { name: /usar mi ubicación/i }));

    expect(
      await screen.findByText(
        'Tu navegador no permite detectar la ubicación. Elige tu país manualmente en Agenda.',
      ),
    ).toBeInTheDocument();
  });

  it('guarda el país detectado por GPS y muestra el chip', async () => {
    const user = userEvent.setup();
    const resolveCountry = vi.fn(async () => ({ country: 'CO', source: 'gps' as const }));
    renderSchedule({ ...createTestDependencies(), resolveCountry });

    await user.click(await screen.findByRole('button', { name: /usar mi ubicación/i }));

    expect(await screen.findByText(/Según tu ubicación · CO/)).toBeInTheDocument();
    expect(resolveCountry).toHaveBeenCalledTimes(1);
  });
});

describe('ScheduleScreen · rechazo del repositorio (R-07)', () => {
  it('muestra ErrorState y «Reintentar» dispara refetch hasta recuperarse', async () => {
    const user = userEvent.setup();
    const getByCountryAndDate = vi
      .fn<() => Promise<ScheduleEntry[]>>()
      .mockRejectedValueOnce(new Error('sin red'))
      .mockResolvedValue([ENTRY]);
    const repositories = createRepositories(getByCountryAndDate);

    renderSchedule(createTestDependencies(), repositories);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('No pudimos cargar la agenda. Revisa tu conexión e inténtalo de nuevo.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('link', { name: /girls/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(getByCountryAndDate).toHaveBeenCalledTimes(2);
    });
  });
});
