import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotificationsPort, NotificationPermissionState } from '@/domain/ports/notifications';
import { DependenciesContext } from '@/presentation/hooks/dependencies-context';
import { RepositoriesContext, type Repositories } from '@/presentation/hooks/repositories-context';
import { ThemeProvider } from '@/presentation/hooks/ThemeProvider';
import { I18nProvider } from '@/shared/i18n/I18nProvider';
import { createFakeAuth } from '@/test/fake-auth';
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

  it('aplica dos taps rápidos de género sin perder el primero (R-08)', async () => {
    const dependencies = renderProfile();

    fireEvent.click(await screen.findByRole('button', { name: 'Drama' }));
    fireEvent.click(screen.getByRole('button', { name: 'Comedy' }));

    await waitFor(async () => {
      const record = await dependencies.db.preferences.get('app');
      expect(record?.favoriteGenres).toEqual(expect.arrayContaining(['Drama', 'Comedy']));
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

describe('ProfileScreen · telemetría (RF-11)', () => {
  it('el interruptor persiste el consentimiento y enlaza a Mi actividad', async () => {
    const user = userEvent.setup();
    const dependencies = renderProfile();

    const toggle = await screen.findByRole('switch', { name: 'Telemetría' });
    await user.click(toggle);

    await waitFor(async () => {
      expect(toggle).toHaveAttribute('aria-checked', 'true');
      expect((await dependencies.db.preferences.get('app'))?.telemetryEnabled).toBe(true);
    });

    expect(screen.getByRole('link', { name: /Mi actividad/ })).toHaveAttribute('href', '/activity');
    expect(
      screen.getByText(/registra la fecha y hora de uso, las opciones que usas/),
    ).toBeInTheDocument();

    await user.click(toggle);
    await waitFor(async () => {
      expect((await dependencies.db.preferences.get('app'))?.telemetryEnabled).toBe(false);
    });
  });
});

describe('ProfileScreen · cuenta (Sprint 5.2)', () => {
  it('muestra el estado actual y enlaza a /account', async () => {
    renderProfile();

    expect(await screen.findByRole('heading', { name: 'Cuenta' })).toBeInTheDocument();
    expect(screen.getByText('Sin configurar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Gestionar/ })).toHaveAttribute('href', '/account');
  });

  it('con cuenta vinculada muestra el correo', async () => {
    const fake = createFakeAuth();
    vi.mocked(fake.auth.getUser).mockResolvedValue({ id: 'user-1', email: 'ana@example.com' });
    renderProfile(createTestDependencies({ auth: fake.auth }));

    expect(await screen.findByText('ana@example.com')).toBeInTheDocument();
  });
});

describe('ProfileScreen · notificaciones push (Web Push)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function stubPushEnvironment(): void {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3L');
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn(async () => 'default'),
    });
    vi.stubGlobal('PushManager', class PushManager {});
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({ pushManager: { getSubscription: async () => null } }),
      },
    });
  }

  it('con clave VAPID y soporte muestra el interruptor de push', async () => {
    stubPushEnvironment();
    renderProfile();

    expect(await screen.findByRole('switch', { name: 'Notificaciones push' })).toBeInTheDocument();
  });

  it('sin clave VAPID no muestra el interruptor de push', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '');
    renderProfile();

    await screen.findByRole('switch', { name: 'Notificaciones' });
    expect(screen.queryByRole('switch', { name: 'Notificaciones push' })).not.toBeInTheDocument();
  });
});
