import { describe, expect, it } from 'vitest';

import type { FavoriteShow } from './favorite';
import { favoriteFromShow, favoriteSnapshot } from './favorite';
import type { Show } from './show';

const NOW = '2026-10-06T10:00:00.000Z';

const SHOW: Show = {
  id: 82,
  name: 'Game of Thrones',
  year: 2011,
  status: 'Ended',
  genres: ['Drama', 'Adventure'],
  rating: 9,
  imageUrl: 'https://static.tvmaze.com/got.jpg',
  summary: '<p>Familias nobles luchan por el trono.</p>',
};

describe('favoriteFromShow', () => {
  it('mapea la serie y sella alta y actualización como pendiente', () => {
    expect(favoriteFromShow(SHOW, NOW)).toEqual({
      showId: 82,
      name: 'Game of Thrones',
      genres: ['Drama', 'Adventure'],
      imageMedium: 'https://static.tvmaze.com/got.jpg',
      premiered: 2011,
      rating: 9,
      addedAt: NOW,
      updatedAt: NOW,
      syncStatus: 'pending',
    });
  });

  it('copia los géneros en vez de compartir el arreglo', () => {
    const favorite = favoriteFromShow(SHOW, NOW);

    favorite.genres.push('Fantasy');

    expect(SHOW.genres).toEqual(['Drama', 'Adventure']);
    expect(favorite).not.toBe(SHOW);
  });

  it('acepta series sin campos opcionales', () => {
    const favorite = favoriteFromShow({ id: 1, name: 'Mínima', genres: [] }, NOW);

    expect(favorite.imageMedium).toBeUndefined();
    expect(favorite.premiered).toBeUndefined();
    expect(favorite.rating).toBeUndefined();
  });
});

describe('favoriteSnapshot', () => {
  const FAVORITE: FavoriteShow = {
    showId: 82,
    name: 'Game of Thrones',
    genres: ['Drama', 'Adventure'],
    imageMedium: 'https://static.tvmaze.com/got.jpg',
    premiered: 2011,
    rating: 9,
    addedAt: NOW,
    updatedAt: NOW,
    syncStatus: 'synced',
  };

  it('extrae solo los datos que viajan a la nube', () => {
    expect(favoriteSnapshot(FAVORITE)).toEqual({
      name: 'Game of Thrones',
      genres: ['Drama', 'Adventure'],
      imageMedium: 'https://static.tvmaze.com/got.jpg',
      premiered: 2011,
      rating: 9,
    });
  });

  it('excluye los campos locales de la copia remota', () => {
    const snapshot = favoriteSnapshot(FAVORITE);

    expect(snapshot).not.toHaveProperty('showId');
    expect(snapshot).not.toHaveProperty('addedAt');
    expect(snapshot).not.toHaveProperty('updatedAt');
    expect(snapshot).not.toHaveProperty('syncStatus');
  });

  it('copia los géneros para no compartir estado con el favorito', () => {
    const snapshot = favoriteSnapshot(FAVORITE);

    snapshot.genres.push('Fantasy');

    expect(FAVORITE.genres).toEqual(['Drama', 'Adventure']);
  });
});
