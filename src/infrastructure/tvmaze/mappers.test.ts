import { describe, expect, it } from 'vitest';

import type { TvmazeScheduleItemDto, TvmazeShowDto } from './schemas';
import { mapEpisode, mapScheduleEntry, mapShow, parseYear } from './mappers';

const showDto: TvmazeShowDto = {
  id: 1,
  name: 'Girls',
  genres: ['Drama', 'Comedia'],
  premiered: '2012-04-15',
  rating: { average: 7.2 },
  image: { medium: 'https://static.tvmaze.com/medium.jpg', original: null },
  summary: '<p>Cuatro <b>amigas</b> en Nueva York.</p>',
  status: 'Ended',
};

describe('mapShow', () => {
  it('deriva el año, la imagen medium y limpia el HTML del resumen', () => {
    expect(mapShow(showDto)).toEqual({
      id: 1,
      name: 'Girls',
      genres: ['Drama', 'Comedia'],
      year: 2012,
      status: 'Ended',
      rating: 7.2,
      imageUrl: 'https://static.tvmaze.com/medium.jpg',
      summary: 'Cuatro amigas en Nueva York.',
    });
  });

  it('omite los campos nullable de TVmaze', () => {
    const mapped = mapShow({
      id: 2,
      name: 'Sin datos',
      genres: [],
      premiered: null,
      rating: null,
      image: null,
      summary: null,
      status: null,
    });

    expect(mapped).toEqual({ id: 2, name: 'Sin datos', genres: [] });
  });
});

describe('parseYear', () => {
  it('extrae el año de una fecha ISO y descarta valores inválidos', () => {
    expect(parseYear('2024-01-01')).toBe(2024);
    expect(parseYear(null)).toBeUndefined();
    expect(parseYear('0001-01-01')).toBeUndefined();
    expect(parseYear('nada')).toBeUndefined();
  });
});

describe('mapEpisode', () => {
  it('normaliza temporada y número nulos a 0', () => {
    expect(mapEpisode({ id: 5, name: 'Especial', season: null, number: null })).toEqual({
      id: 5,
      name: 'Especial',
      season: 0,
      number: 0,
      airdate: undefined,
    });
  });
});

describe('mapScheduleEntry', () => {
  it('usa el canal de network o webChannel y la imagen medium', () => {
    const dto: TvmazeScheduleItemDto = {
      id: 9,
      name: 'Pilot',
      season: 1,
      number: 1,
      airdate: '2026-10-05',
      airtime: '21:00',
      show: {
        id: 7,
        name: 'Dark',
        genres: ['Drama'],
        network: { id: 1, name: 'Netflix' },
        webChannel: null,
        image: { medium: 'https://static.tvmaze.com/dark.jpg', original: null },
        premiered: '2017-12-01',
      },
    };

    expect(mapScheduleEntry(dto)).toEqual({
      episodeId: 9,
      airdate: '2026-10-05',
      airtime: '21:00',
      episodeName: 'Pilot',
      season: 1,
      number: 1,
      showId: 7,
      showName: 'Dark',
      showImageUrl: 'https://static.tvmaze.com/dark.jpg',
      genres: ['Drama'],
      channel: 'Netflix',
    });
  });

  it('usa webChannel cuando network es null y airtime null queda indefinido', () => {
    const dto: TvmazeScheduleItemDto = {
      id: 10,
      name: 'Estreno',
      season: 2,
      number: 3,
      airdate: '2026-10-06',
      airtime: null,
      show: {
        id: 8,
        name: 'Severance',
        genres: ['Drama'],
        network: null,
        webChannel: { id: 2, name: 'Apple TV+' },
        image: null,
      },
    };

    const mapped = mapScheduleEntry(dto);
    expect(mapped.channel).toBe('Apple TV+');
    expect(mapped.airtime).toBeUndefined();
    expect(mapped.showImageUrl).toBeUndefined();
  });
});
