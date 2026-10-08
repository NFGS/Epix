import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DependenciesContext } from '@/presentation/hooks/dependencies-context';
import { RepositoriesContext, type Repositories } from '@/presentation/hooks/repositories-context';
import { ThemeProvider } from '@/presentation/hooks/ThemeProvider';
import { I18nProvider } from '@/shared/i18n/I18nProvider';
import { createTestDependencies } from '@/test/test-dependencies';

import { PrivacyScreen } from './PrivacyScreen';
import { ProfileScreen } from './ProfileScreen';

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

function createRepositories(): Repositories {
  return {
    shows: {
      search: vi.fn(async () => []),
      getById: vi.fn(async () => {
        throw new Error('repositorio de series no usado en Privacidad');
      }),
      getEpisodes: vi.fn(async () => []),
      getNextEpisode: vi.fn(async () => null),
    },
    schedule: {
      getByCountryAndDate: vi.fn(async () => []),
    },
  };
}

describe('PrivacyScreen', () => {
  it('renderiza los títulos clave y los enlaces internos', () => {
    render(
      <I18nProvider>
        <MemoryRouter>
          <PrivacyScreen />
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Privacidad' })).toBeInTheDocument();

    for (const title of [
      'Qué se guarda en tu dispositivo',
      'Telemetría (opcional)',
      'Reportes de errores (opcional)',
      'Ubicación (GPS)',
      'Tus derechos',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
    }

    expect(screen.getByRole('link', { name: 'Revisar y borrar mi actividad' })).toHaveAttribute(
      'href',
      '/activity',
    );
  });

  it('navega desde el enlace de privacidad en Perfil', async () => {
    const user = userEvent.setup();

    render(
      <RepositoriesContext.Provider value={createRepositories()}>
        <DependenciesContext.Provider value={createTestDependencies()}>
          <ThemeProvider>
            <I18nProvider>
              <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                  <Route path="/profile" element={<ProfileScreen />} />
                  <Route path="/privacy" element={<PrivacyScreen />} />
                </Routes>
              </MemoryRouter>
            </I18nProvider>
          </ThemeProvider>
        </DependenciesContext.Provider>
      </RepositoriesContext.Provider>,
    );

    await user.click(await screen.findByRole('link', { name: 'Leer política' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Privacidad' }),
    ).toBeInTheDocument();
  });
});
