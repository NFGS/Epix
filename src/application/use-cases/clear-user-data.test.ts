import { describe, expect, it, vi } from 'vitest';

import type { OutboxEntity } from '@/domain/ports/outbox-repository';

import { clearUserData } from './clear-user-data';

function createDeps() {
  const purged: OutboxEntity[] = [];

  return {
    purged,
    favorites: { clear: vi.fn(async () => undefined) },
    history: { clear: vi.fn(async () => undefined) },
    usageEvents: { clear: vi.fn(async () => undefined) },
    syncMeta: { clear: vi.fn(async () => undefined) },
    outbox: {
      purgeByEntity: vi.fn(async (entity: OutboxEntity) => {
        purged.push(entity);
      }),
    },
  };
}

describe('clearUserData (cierre de sesión)', () => {
  it('vacía favoritos, historial, actividad y cursores, y purga el outbox', async () => {
    const deps = createDeps();

    await clearUserData(deps);

    expect(deps.favorites.clear).toHaveBeenCalledTimes(1);
    expect(deps.history.clear).toHaveBeenCalledTimes(1);
    expect(deps.usageEvents.clear).toHaveBeenCalledTimes(1);
    expect(deps.syncMeta.clear).toHaveBeenCalledTimes(1);
    expect(deps.purged).toEqual(['favorite', 'history', 'telemetry']);
  });

  it('propaga el fallo de un almacén para que la UI lo muestre', async () => {
    const deps = createDeps();
    deps.favorites.clear.mockRejectedValueOnce(new Error('IndexedDB bloqueada'));

    await expect(clearUserData(deps)).rejects.toThrow('IndexedDB bloqueada');
    expect(deps.history.clear).not.toHaveBeenCalled();
  });
});
