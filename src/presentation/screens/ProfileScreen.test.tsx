import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotificationsPort, NotificationPermissionState } from '@/domain/ports/notifications';
import { DependenciesContext } from '@/presentation/hooks/dependencies-context';
import { RepositoriesContext, type Repositories } from '@/presentation/hooks/repositories-context';
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

function createRepositories(): Repositories {
  return {
    shows: {
      search: vi.fn(async () => []),
      getById: vi.fn(async () => {
        throw new Error('repositorio de series no usado en Perfil');
      }),
      getEpisodes: vi.fn(async () => []),
      getNextEpisode: vi.fn(async () => null),
    },
    schedule: {
      getByCountryAndDate: vi.fn(async () => []),
    },
  };
}

function renderProfile(dependencies: TestDependencies = createTestDependencies()) {
  render(
    <RepositoriesContext.Provider value={createRepositories()}>
      <DependenciesContext.Provider value={dependencies}>
        <ThemeProvider>
          <I18nProvider>
            <MemoryRouter>
              <ProfileScreen />
            </MemoryRouter>
          </I18nProvider>
        </ThemeProvider>
      </DependenciesContext.Provider>
    </RepositoriesContext.Provider>,
  );

  return dependencies;
}

function createNotifications(overrides: Partial<NotificationsPort> = {}): NotificationsPort {
  return {
    getPermissionState: vi.fn((): NotificationPermissionState => 'default'),
    requestPermission: vi.fn(async (): Promise<NotificationPermissionState> => 'granted'),
    showLocalNotification: vi.fn(async () => undefined),
    ...overrides,
  };
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

describe('ProfileScreen · notificaciones (RF-10)', () => {
  it('al activar el interruptor pide permiso y persiste la preferencia si se concede', async () => {
    const user = userEvent.setup();
    const requestPermission = vi.fn(async (): Promise<NotificationPermissionState> => 'granted');
    const dependencies = renderProfile(
      createTestDependencies({
        notifications: createNotifications({ requestPermission }),
      }),
    );

    const toggle = await screen.findByRole('switch', { name: 'Notificaciones' });
    await user.click(toggle);

    await waitFor(async () => {
      expect(toggle).toHaveAttribute('aria-checked', 'true');
      expect((await dependencies.db.preferences.get('app'))?.notificationsEnabled).toBe(true);
    });
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it('si el navegador deniega el permiso, muestra la instrucción y no persiste', async () => {
    const user = userEvent.setup();
    const dependencies = renderProfile(
      createTestDependencies({
        notifications: createNotifications({
          requestPermission: vi.fn(async (): Promise<NotificationPermissionState> => 'denied'),
        }),
      }),
    );

    await user.click(await screen.findByRole('switch', { name: 'Notificaciones' }));

    expect(
      await screen.findByText(/Actívalas en la configuración del sitio y recarga la página/),
    ).toBeInTheDocument();
    // Sin concesión no se escribe la preferencia (la fila solo se siembra al arrancar).
    expect(await dependencies.db.preferences.get('app')).toBeUndefined();
  });

  it('envía una notificación de prueba con deep link a favoritos', async () => {
    const user = userEvent.setup();
    const showLocalNotification = vi.fn(async () => undefined);
    const dependencies = createTestDependencies({
      notifications: createNotifications({
        getPermissionState: vi.fn((): NotificationPermissionState => 'granted'),
        showLocalNotification,
      }),
    });
    await dependencies.preferences.update({ notificationsEnabled: true });
    renderProfile(dependencies);

    await user.click(await screen.findByRole('button', { name: /notificación de prueba/i }));

    await waitFor(() => {
      expect(showLocalNotification).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/favorites', tag: 'epix-test' }),
      );
    });
    expect(await screen.findByText('Notificación de prueba enviada.')).toBeInTheDocument();
  });
});
