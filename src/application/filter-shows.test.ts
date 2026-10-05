import { describe, expect, it } from 'vitest';

import { filterShows, type ShowFilters } from './filter-shows';

interface Item {
  name: string;
  genres: string[];
}

function item(name: string, genres: string[]): Item {
  return { name, genres };
}

const NO_FILTERS: ShowFilters = { favoriteGenres: [], maxAgeRating: 'TV-MA' };

describe('filterShows', () => {
  it('sin filtros devuelve todo y no oculta nada', () => {
    const items = [item('A', ['Drama']), item('B', ['Children'])];

    expect(filterShows(items, NO_FILTERS)).toEqual({ visible: items, hiddenCount: 0 });
  });

  it('filtra por géneros favoritos exigiendo intersección', () => {
    const drama = item('Drama', ['Drama']);
    const comedy = item('Comedia', ['Comedy']);

    const { visible, hiddenCount } = filterShows([drama, comedy], {
      favoriteGenres: ['Drama', 'Mystery'],
      maxAgeRating: 'TV-MA',
    });

    expect(visible).toEqual([drama]);
    expect(hiddenCount).toBe(1);
  });

  it('filtra solo por edad estimada', () => {
    const kinder = item('Kinder', ['Children']);
    const comedy = item('Comedia', ['Comedy']);
    const drama = item('Drama', ['Drama']);

    const { visible, hiddenCount } = filterShows([kinder, comedy, drama], {
      favoriteGenres: [],
      maxAgeRating: 'TV-PG',
    });

    expect(visible).toEqual([kinder, comedy]);
    expect(hiddenCount).toBe(1);
  });

  it('combina géneros y edad: deben cumplirse ambos filtros', () => {
    const kidsComedy = item('Infantil', ['Children', 'Comedy']);
    const drama = item('Drama', ['Drama']);
    const comedy = item('Comedia', ['Comedy']);

    const { visible, hiddenCount } = filterShows([kidsComedy, drama, comedy], {
      favoriteGenres: ['Children', 'Drama'],
      maxAgeRating: 'TV-PG',
    });

    expect(visible).toEqual([kidsComedy]);
    expect(hiddenCount).toBe(2);
  });

  it('cuenta todos los ocultos cuando nada cumple los filtros', () => {
    const items = [item('Drama', ['Drama']), item('Terror', ['Horror'])];

    const { visible, hiddenCount } = filterShows(items, {
      favoriteGenres: ['Drama'],
      maxAgeRating: 'TV-PG',
    });

    expect(visible).toEqual([]);
    expect(hiddenCount).toBe(2);
  });
});
