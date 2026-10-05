import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DependenciesContext } from '@/presentation/hooks/dependencies-context';
import { ThemeProvider } from '@/presentation/hooks/ThemeProvider';
import { I18nProvider } from '@/shared/i18n/I18nProvider';
import { createTestDependencies, type TestDependencies } from '@/test/test-dependencies';

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

function renderProfile(dependencies: TestDependencies = createTestDependencies()) {
  render(
    <DependenciesContext.Provider value={dependencies}>
      <ThemeProvider>
        <I18nProvider>
          <MemoryRouter>
            <ProfileScreen />
          </MemoryRouter>
        </I18nProvider>
      </ThemeProvider>
    </DependenciesContext.Provider>,
  );

  return dependencies;
}

describe('ProfileScreen · preferencias de contenido', () => {
  it('persiste al instante el género seleccionado en preferences', async () => {
    const user = userEvent.setup();
    const dependencies = renderProfile();

    const drama = await screen.findByRole('button', { name: 'Drama' });
    await user.click(drama);

    await waitFor(() => {
      expect(drama).toHaveAttribute('aria-pressed', 'true');
    });
    expect((await dependencies.db.preferences.get('app'))?.favoriteGenres).toEqual(['Drama']);
  });

  it('combina género y edad máxima estimada sin pisarse', async () => {
    const user = userEvent.setup();
    const dependencies = renderProfile();

    await user.click(await screen.findByRole('button', { name: /TV-PG/ }));
    await user.click(screen.getByRole('button', { name: 'Horror' }));

    await waitFor(async () => {
      const record = await dependencies.db.preferences.get('app');
      expect(record?.maxAgeRating).toBe('TV-PG');
      expect(record?.favoriteGenres).toEqual(['Horror']);
    });
  });
});
