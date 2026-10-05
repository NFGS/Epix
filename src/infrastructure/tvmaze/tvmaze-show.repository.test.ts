import { describe, expect, it, vi } from 'vitest';

import { TvmazeNotFoundError, type TvmazeClient } from './client';
import { createTvmazeShowRepository } from './tvmaze-show.repository';

function createClient() {
  const get = vi.fn();
  const client: TvmazeClient = { get };
  return { client, get };
}

const showDto = {
  id: 1,
  name: 'Girls',
  genres: ['Drama'],
  premiered: '2012-04-15',
  rating: { average: 7.2 },
  image: { medium: 'https://static.tvmaze.com/medium.jpg', original: null },
  summary: '<p>Cuatro amigas.</p>',
  status: 'Ended',
};

describe('TvmazeShowRepository', () => {
  it('consulta el endpoint de búsqueda con la query codificada y mapea resultados', async () => {
    const { client, get } = createClient();
    get.mockResolvedValueOnce([{ score: 0.9, show: showDto }]);

    const repository = createTvmazeShowRepository(client);
    const shows = await repository.search('girls & co');

    expect(get).toHaveBeenCalledWith('/search/shows?q=girls%20%26%20co', expect.anything());
    expect(shows).toEqual([
      {
        id: 1,
        name: 'Girls',
        genres: ['Drama'],
        year: 2012,
        status: 'Ended',
        rating: 7.2,
        imageUrl: 'https://static.tvmaze.com/medium.jpg',
        summary: 'Cuatro amigas.',
      },
    ]);
  });

  it('devuelve null cuando el detalle responde 404', async () => {
    const { client, get } = createClient();
    get.mockRejectedValueOnce(new TvmazeNotFoundError());

    const repository = createTvmazeShowRepository(client);

    await expect(repository.getById(999)).resolves.toBeNull();
    expect(get).toHaveBeenCalledWith('/shows/999', expect.anything());
  });

  it('consulta los episodios por id de serie', async () => {
    const { client, get } = createClient();
    get.mockResolvedValueOnce([
      { id: 5, name: 'Pilot', season: 1, number: 1, airdate: '2012-04-15' },
    ]);

    const repository = createTvmazeShowRepository(client);

    await expect(repository.getEpisodes(42)).resolves.toEqual([
      { id: 5, name: 'Pilot', season: 1, number: 1, airdate: '2012-04-15' },
    ]);
    expect(get).toHaveBeenCalledWith('/shows/42/episodes', expect.anything());
  });

  it('propaga errores distintos al 404', async () => {
    const { client, get } = createClient();
    get.mockRejectedValueOnce(new Error('boom'));

    const repository = createTvmazeShowRepository(client);

    await expect(repository.getById(1)).rejects.toThrow('boom');
  });

  it('consulta el próximo episodio embebido y lo mapea', async () => {
    const { client, get } = createClient();
    get.mockResolvedValueOnce({
      ...showDto,
      _embedded: {
        nextepisode: { id: 9, name: 'Finale', season: 3, number: 8, airdate: '2026-10-05' },
      },
    });

    const repository = createTvmazeShowRepository(client);

    await expect(repository.getNextEpisode(42)).resolves.toEqual({
      id: 9,
      name: 'Finale',
      season: 3,
      number: 8,
      airdate: '2026-10-05',
    });
    expect(get).toHaveBeenCalledWith('/shows/42?embed=nextepisode', expect.anything());
  });

  it('devuelve null cuando la serie no tiene próximo episodio', async () => {
    const { client, get } = createClient();
    get.mockResolvedValueOnce({ ...showDto, _embedded: {} });

    const repository = createTvmazeShowRepository(client);

    await expect(repository.getNextEpisode(1)).resolves.toBeNull();
  });

  it('devuelve null si la serie no existe en TVmaze', async () => {
    const { client, get } = createClient();
    get.mockRejectedValueOnce(new TvmazeNotFoundError());

    const repository = createTvmazeShowRepository(client);

    await expect(repository.getNextEpisode(999)).resolves.toBeNull();
  });
});
