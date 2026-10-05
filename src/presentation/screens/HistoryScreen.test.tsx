import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { SyncAdapter } from '@/application/ports/sync-adapter';
import type { HistoryEntry } from '@/domain/entities/history-entry';
import { DependenciesContext } from '@/presentation/hooks/dependencies-context';
import { I18nProvider } from '@/shared/i18n/I18nProvider';
import { createTestDependencies, type TestDependencies } from '@/test/test-dependencies';

import { HistoryScreen } from './HistoryScreen';

const T1 = '2026-10-05T10:00:00.000Z';

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

function viewEntry(): HistoryEntry {
  return {
    type: 'view',
    showId: 7,
    showName: 'Girls',
    occurredAt: T1,
    timezone: 'America/Bogota',
    syncStatus: 'pending',
  };
}

async function seedHistoryWithOutbox(dependencies: TestDependencies): Promise<void> {
  await dependencies.history.addView(viewEntry());
  const operation = await dependencies.outbox.enqueue({
    entity: 'history',
    operation: 'push',
    entityId: 'op-1',
    payload: viewEntry(),
    createdAt: T1,
  });

  if (operation.id !== undefined) {
    await dependencies.outbox.markSent(operation.id);
  }
}

function renderHistory(dependencies: TestDependencies) {
  render(
    <DependenciesContext.Provider value={dependencies}>
      <I18nProvider>
        <MemoryRouter>
          <HistoryScreen />
        </MemoryRouter>
      </I18nProvider>
    </DependenciesContext.Provider>,
  );

  return dependencies;
}

describe('HistoryScreen · borrado (R-09 / R-01)', () => {
  it('muestra el error si el borrado local falla', async () => {
    const user = userEvent.setup();
    const dependencies = createTestDependencies();
    await seedHistoryWithOutbox(dependencies);
    vi.spyOn(dependencies.history, 'clear').mockRejectedValue(new Error('cuota excedida'));

    renderHistory(dependencies);

    await user.click(await screen.findByRole('button', { name: 'Vaciar historial' }));
    await user.click(screen.getByRole('button', { name: 'Vaciar' }));

    expect(
      await screen.findByText('No pudimos vaciar el historial. Inténtalo de nuevo.'),
    ).toBeInTheDocument();
  });

  it('purga el outbox de historial (pendientes y enviadas) y encola solo el clear remoto', async () => {
    const user = userEvent.setup();
    const dependencies = createTestDependencies({ adapter: createFakeAdapter() });
    await seedHistoryWithOutbox(dependencies);

    renderHistory(dependencies);

    await user.click(await screen.findByRole('button', { name: 'Vaciar historial' }));
    await user.click(screen.getByRole('button', { name: 'Vaciar' }));

    expect(await screen.findByText('Tu historial se vació correctamente.')).toBeInTheDocument();

    await waitFor(async () => {
      const operations = await dependencies.db.outbox.toArray();
      expect(operations).toHaveLength(1);
      expect(operations[0]).toMatchObject({ entity: 'history', operation: 'clear' });
    });
    expect(await dependencies.db.history.count()).toBe(0);
    expect(await dependencies.db.searchHistory.count()).toBe(0);
  });
});
