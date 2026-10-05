import { describe, expect, it } from 'vitest';

import { AGE_RATINGS, estimateShowAge, GENRE_AGE_RATINGS, isAllowedByAge } from './content-rating';

describe('estimateShowAge', () => {
  it('estima cada nivel a partir de un género representativo', () => {
    expect(estimateShowAge(['Children'])).toBe('TV-Y');
    expect(estimateShowAge(['Anime'])).toBe('TV-Y7');
    expect(estimateShowAge(['Family'])).toBe('TV-G');
    expect(estimateShowAge(['Comedy'])).toBe('TV-PG');
    expect(estimateShowAge(['Drama'])).toBe('TV-14');
    expect(estimateShowAge(['Horror'])).toBe('TV-MA');
  });

  it('cubre los seis niveles con al menos un género del mapa', () => {
    expect(new Set(Object.values(GENRE_AGE_RATINGS))).toEqual(new Set(AGE_RATINGS));
  });

  it('toma el nivel máximo entre los géneros de una serie', () => {
    expect(estimateShowAge(['Children', 'Comedy'])).toBe('TV-PG');
    expect(estimateShowAge(['Family', 'Horror'])).toBe('TV-MA');
  });

  it('trata los géneros desconocidos como TV-14 (criterio conservador)', () => {
    expect(estimateShowAge(['Género inexistente'])).toBe('TV-14');
    expect(estimateShowAge(['Children', 'Género inexistente'])).toBe('TV-14');
  });

  it('usa TV-Y7 cuando la serie no tiene géneros', () => {
    expect(estimateShowAge([])).toBe('TV-Y7');
  });
});

describe('isAllowedByAge', () => {
  it('permite contenido igual o menos maduro que el máximo', () => {
    expect(isAllowedByAge(['Comedy'], 'TV-PG')).toBe(true);
    expect(isAllowedByAge(['Children'], 'TV-Y7')).toBe(true);
    expect(isAllowedByAge([], 'TV-MA')).toBe(true);
  });

  it('bloquea contenido más maduro que el máximo', () => {
    expect(isAllowedByAge(['Drama'], 'TV-PG')).toBe(false);
    expect(isAllowedByAge(['Horror'], 'TV-14')).toBe(false);
    expect(isAllowedByAge(['Anime'], 'TV-Y')).toBe(false);
  });
});
