import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { SyncAdapter } from '@/application/ports/sync-adapter';
import type { UsageEvent } from '@/domain/entities/usage-event';
import { DependenciesContext } from '@/presentation/hooks/dependencies-context';
import { I18nProvider } from '@/shared/i18n/I18nProvider';
import { createTestDependencies, type TestDependencies } from '@/test/test-dependencies';

import { ActivityScreen } from './ActivityScreen';

function createEvent(overrides: Partial<UsageEvent> = {}): UsageEvent {
  return {
    id: crypto.randomUUID(),
    eventType: 'search',
    occurredAt: new Date().toISOString(),
    timezone: 'America/Bogota',
    appVersion: 'test',
    payload: { query: 'girls', results: 3 },
    ...overrides,
  };
}

function renderActivity(dependencies: TestDependencies = createTestDependencies()) {
  render(
    <DependenciesContext.Provider value={dependencies}>
      <I18nProvider>
        <ActivityScreen />
      </I18nProvider>
    </DependenciesContext.Provider>,
  );

  return dependencies;
}

function createFakeAdapter(): SyncAdapter {
  return {
    ensureSession: vi.fn(async () => 'user-1'),
    pullFavorites: vi.fn(async () => []),
    upsertFavorites: vi.fn(async () => undefined),
    deleteFavorites: vi.fn(async () => undefined),
    pushHistory: vi.fn(async () => undefined),
    clearRemoteHistory: vi.fn(async () => undefined),
    pushEvents: vi.fn(async () => undefined),
    clearRemoteEvents: vi.fn(async () => undefined),
  };
}

describe('ActivityScreen (RF-11 / RNF-03)', () => {
  it('muestra los eventos agrupados con etiqueta, resumen y hora accesible', async () => {
    const search = createEvent();
    const favorite = createEvent({
      eventType: 'favorite_add',
      payload: { showId: 7 },
    });
    const dependencies = createTestDependencies();
    await dependencies.usageEvents.add(search);
    await dependencies.usageEvents.add(favorite);

    renderActivity(dependencies);

    expect(await screen.findByText('Búsqueda')).toBeInTheDocument();
    expect(screen.getByText('«girls» · 3 resultado(s)')).toBeInTheDocument();
    expect(screen.getByText('Favorito añadido')).toBeInTheDocument();
    expect(screen.getByText('Serie #7')).toBeInTheDocument();

    const list = screen.getByRole('list', { name: 'Eventos de uso registrados' });
    const time = list.querySelector('time');
    expect(time?.getAttribute('datetime')).toBeDefined();
    expect(screen.getByText(/Estos eventos viven en tu dispositivo/)).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay actividad', async () => {
    renderActivity();

    expect(await screen.findByText('Todavía no hay actividad')).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Eventos de uso registrados' }),
    ).not.toBeInTheDocument();
  });

  it('borra los datos locales tras confirmar en el diálogo', async () => {
    const user = userEvent.setup();
    const dependencies = createTestDependencies();
    await dependencies.usageEvents.add(createEvent());
    await dependencies.usageEvents.add(
      createEvent({ eventType: 'session_start', payload: undefined }),
    );

    renderActivity(dependencies);

    await user.click(await screen.findByRole('button', { name: 'Borrar mis datos' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Borrar' }));

    expect(await screen.findByText('Tu actividad se borró correctamente.')).toBeInTheDocument();
    await waitFor(async () => {
      expect(await dependencies.db.usageEvents.count()).toBe(0);
    });
    expect(await dependencies.outbox.listPending()).toEqual([]);
  });

  it('encola el borrado remoto cuando hay nube configurada', async () => {
    const user = userEvent.setup();
    const dependencies = createTestDependencies({ adapter: createFakeAdapter() });
    await dependencies.usageEvents.add(createEvent());

    renderActivity(dependencies);

    await user.click(await screen.findByRole('button', { name: 'Borrar mis datos' }));
    await user.click(screen.getByRole('button', { name: 'Borrar' }));

    await waitFor(async () => {
      const pending = await dependencies.outbox.listPending();
      expect(pending).toHaveLength(1);
      expect(pending[0]).toMatchObject({ entity: 'telemetry', operation: 'clear' });
    });
  });
});
