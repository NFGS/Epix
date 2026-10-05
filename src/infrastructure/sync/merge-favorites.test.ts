import { describe, expect, it } from 'vitest';

import type { RemoteFavorite } from '@/application/ports/sync-adapter';
import type { FavoriteShow } from '@/domain/entities/favorite';

import { mergeFavorites } from './merge-favorites';

const T1 = '2026-10-05T10:00:00.000Z';
const T2 = '2026-10-05T11:00:00.000Z';

function localFavorite(overrides: Partial<FavoriteShow> = {}): FavoriteShow {
  return {
    showId: 1,
    name: 'Local',
    genres: ['Drama'],
    addedAt: T1,
    updatedAt: T1,
    syncStatus: 'synced',
    ...overrides,
  };
}

function remoteFavorite(overrides: Partial<RemoteFavorite> = {}): RemoteFavorite {
  return {
    showId: 1,
    snapshot: { name: 'Remota', genres: ['Drama'] },
    addedAt: T1,
    updatedAt: T1,
    ...overrides,
  };
}

describe('mergeFavorites (last-write-wins)', () => {
  it('el remoto más reciente gana', () => {
    const merged = mergeFavorites([localFavorite()], [remoteFavorite({ updatedAt: T2 })]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ name: 'Remota', syncStatus: 'synced' });
  });

  it('el local más reciente se conserva con su estado pendiente', () => {
    const merged = mergeFavorites(
      [localFavorite({ updatedAt: T2, syncStatus: 'pending' })],
      [remoteFavorite()],
    );

    expect(merged[0]).toMatchObject({ name: 'Local', syncStatus: 'pending' });
  });

  it('añade favoritos solo remotos', () => {
    const merged = mergeFavorites([], [remoteFavorite({ showId: 9, updatedAt: T2 })]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ showId: 9, name: 'Remota' });
  });

  it('conserva favoritos solo locales', () => {
    const merged = mergeFavorites([localFavorite({ showId: 3 })], []);

    expect(merged[0]).toMatchObject({ showId: 3, name: 'Local' });
  });

  it('un tombstone remoto más reciente marca el borrado local', () => {
    const merged = mergeFavorites(
      [localFavorite()],
      [remoteFavorite({ updatedAt: T2, deletedAt: T2 })],
    );

    expect(merged[0].deletedAt).toBe(T2);
  });

  it('ante timestamps iguales gana el remoto de forma determinista (R-05)', () => {
    const merged = mergeFavorites(
      [localFavorite({ name: 'Local', syncStatus: 'pending', updatedAt: T1 })],
      [remoteFavorite({ updatedAt: T1 })],
    );

    expect(merged[0]).toMatchObject({ name: 'Remota', syncStatus: 'synced' });
  });

  it('con updatedAt igual, el tombstone remoto gana al local vivo (R-05)', () => {
    const merged = mergeFavorites(
      [localFavorite({ updatedAt: T1 })],
      [remoteFavorite({ updatedAt: T1, deletedAt: T1 })],
    );

    expect(merged[0].deletedAt).toBe(T1);
  });

  it('con updatedAt igual, un tombstone local más reciente se conserva (R-05)', () => {
    const localTombstone = localFavorite({ updatedAt: T1, deletedAt: T2, syncStatus: 'pending' });
    const merged = mergeFavorites([localTombstone], [remoteFavorite({ updatedAt: T1 })]);

    expect(merged[0]).toMatchObject({ syncStatus: 'pending', deletedAt: T2 });
  });
});
