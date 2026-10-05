import { describe, expect, it, vi } from 'vitest';

import type { Show } from '@/domain/entities/show';
import type { ShowRepository } from '@/domain/ports/show-repository';

import { MIN_SEARCH_LENGTH, searchShows } from './search-shows';

const girls: Show = { id: 1, name: 'Girls', genres: ['Drama'] };

function createRepository(): ShowRepository {
  return {
    search: vi.fn(async () => [girls]),
    getById: vi.fn(async () => girls),
  };
}

describe('searchShows', () => {
  it('no consulta el repositorio si la consulta es más corta que el mínimo', async () => {
    const repository = createRepository();

    await expect(searchShows(repository, 'ab')).resolves.toEqual([]);
    expect(repository.search).not.toHaveBeenCalled();
  });

  it('recorta espacios y delega la consulta normalizada en el repositorio', async () => {
    const repository = createRepository();

    await expect(searchShows(repository, '  girls  ')).resolves.toEqual([girls]);
    expect(repository.search).toHaveBeenCalledWith('girls');
  });

  it('expone el mínimo de caracteres como constante', () => {
    expect(MIN_SEARCH_LENGTH).toBe(3);
  });
});
