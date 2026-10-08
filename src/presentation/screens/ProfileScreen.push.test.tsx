import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PushNotificationsHandle } from '@/presentation/hooks/use-push-notifications';
import { DependenciesContext } from '@/presentation/hooks/dependencies-context';
import { RepositoriesContext, type Repositories } from '@/presentation/hooks/repositories-context';
import { ThemeProvider } from '@/presentation/hooks/ThemeProvider';
import { I18nProvider } from '@/shared/i18n/I18nProvider';
import { createTestDependencies, type TestDependencies } from '@/test/test-dependencies';

import { ProfileScreen } from './ProfileScreen';

const pushState = vi.hoisted(() => ({
  handle: null as unknown,
}));

vi.mock('@/presentation/hooks/use-push-notifications', () => ({
  usePushNotifications: () => pushState.handle,
}));

function createPushHandle(
  overrides: Partial<PushNotificationsHandle> = {},
): PushNotificationsHandle {
  return {
    status: 'disabled',
    isAvailable: true,
    errorAction: null,
    enable: vi.fn(async () => true),
    disable: vi.fn(async () => true),
    sendTest: vi.fn(async () => true),
    ...overrides,
  };
}

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

describe('ProfileScreen · push (auditoría)', () => {
  it('al activar el push persiste notificationsEnabled (P-01)', async () => {
    const user = userEvent.setup();
    const handle = createPushHandle();
    pushState.handle = handle;
    const dependencies = renderProfile();

    await user.click(await screen.findByRole('switch', { name: 'Notificaciones push' }));

    await waitFor(async () => {
      expect(handle.enable).toHaveBeenCalledTimes(1);
      expect((await dependencies.db.preferences.get('app'))?.notificationsEnabled).toBe(true);
    });
  });

  it('si activar falla, no enciende el interruptor principal (P-01)', async () => {
    const user = userEvent.setup();
    const handle = createPushHandle({ enable: vi.fn(async () => false) });
    pushState.handle = handle;
    const dependencies = renderProfile();

    await user.click(await screen.findByRole('switch', { name: 'Notificaciones push' }));

    await waitFor(() => {
      expect(handle.enable).toHaveBeenCalledTimes(1);
    });
    expect((await dependencies.db.preferences.get('app'))?.notificationsEnabled).not.toBe(true);
  });

  it('al desactivar el push no toca el interruptor principal (P-01)', async () => {
    const user = userEvent.setup();
    const handle = createPushHandle({ status: 'subscribed' });
    pushState.handle = handle;
    const dependencies = renderProfile();
    await dependencies.preferences.update({ notificationsEnabled: true });

    await user.click(await screen.findByRole('switch', { name: 'Notificaciones push' }));

    await waitFor(() => {
      expect(handle.disable).toHaveBeenCalledTimes(1);
    });
    expect((await dependencies.db.preferences.get('app'))?.notificationsEnabled).toBe(true);
  });

  it('en ready el switch queda deshabilitado y con aria-busy (P-03)', async () => {
    pushState.handle = createPushHandle({ status: 'ready' });
    renderProfile();

    const toggle = await screen.findByRole('switch', { name: 'Notificaciones push' });

    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute('aria-busy', 'true');
  });

  it('muestra el error de activación y lo enlaza con aria-describedby (P-06/P-09)', async () => {
    pushState.handle = createPushHandle({ status: 'disabled', errorAction: 'enable' });
    renderProfile();

    const toggle = await screen.findByRole('switch', { name: 'Notificaciones push' });

    expect(toggle).toHaveAttribute('aria-describedby', 'push-notifications-error');
    expect(
      screen.getByText('No pudimos activar las notificaciones push. Inténtalo de nuevo.'),
    ).toBeInTheDocument();
  });

  it('muestra el error de desactivación (P-06)', async () => {
    pushState.handle = createPushHandle({ status: 'subscribed', errorAction: 'disable' });
    renderProfile();

    expect(
      await screen.findByText('No pudimos desactivar las notificaciones push. Inténtalo de nuevo.'),
    ).toBeInTheDocument();
  });

  it('muestra el error de consulta (P-06)', async () => {
    pushState.handle = createPushHandle({ status: 'error', errorAction: 'query' });
    renderProfile();

    expect(
      await screen.findByText('No pudimos consultar el estado de las notificaciones push.'),
    ).toBeInTheDocument();
  });
});
