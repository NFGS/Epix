import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { ScheduleEntry } from '@/domain/entities/schedule-entry';
import type { Show } from '@/domain/entities/show';
import { DependenciesContext } from '@/presentation/hooks/dependencies-context';
import { RepositoriesContext, type Repositories } from '@/presentation/hooks/repositories-context';
import { I18nProvider } from '@/shared/i18n/I18nProvider';
import { createTestDependencies, type TestDependencies } from '@/test/test-dependencies';

import { ScheduleScreen } from './ScheduleScreen';

function createRepositories(): Repositories {
  return {
    shows: {
      search: vi.fn(async (): Promise<Show[]> => []),
      getById: vi.fn(async (): Promise<Show> => {
        throw new Error('repositorio de series no usado en la Agenda');
      }),
      getEpisodes: vi.fn(async () => []),
    },
    schedule: {
      getByCountryAndDate: vi.fn(async (): Promise<ScheduleEntry[]> => []),
    },
  };
}

function renderSchedule(dependencies: TestDependencies) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RepositoriesContext.Provider value={createRepositories()}>
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
    renderSchedule(createTestDependencies());

    await user.click(await screen.findByRole('button', { name: /usar mi ubicación/i }));

    expect(
      await screen.findByText(
        'Tu navegador no permite detectar la ubicación. Elige tu país manualmente en Agenda.',
      ),
    ).toBeInTheDocument();
  });
});
