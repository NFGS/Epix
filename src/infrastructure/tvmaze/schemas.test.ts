import { describe, expect, it } from 'vitest';

import {
  tvmazeEpisodeSchema,
  tvmazeScheduleItemSchema,
  tvmazeSearchResponseSchema,
  tvmazeShowSchema,
} from './schemas';

const baseShow = {
  id: 1,
  name: 'Girls',
  genres: ['Drama'],
  premiered: '2012-04-15',
  rating: { average: 7.2 },
  image: { medium: 'https://static.tvmaze.com/medium.jpg', original: 'original.jpg' },
  summary: '<p>Cuatro amigas en Nueva York.</p>',
  status: 'Ended',
};

describe('schemas TVmaze', () => {
  it('acepta un show válido con campos nullable de TVmaze', () => {
    const parsed = tvmazeShowSchema.safeParse({
      ...baseShow,
      premiered: null,
      rating: null,
      image: null,
      summary: null,
      status: null,
    });

    expect(parsed.success).toBe(true);
  });

  it('rechaza un show sin nombre o con id no numérico', () => {
    expect(tvmazeShowSchema.safeParse({ ...baseShow, name: undefined }).success).toBe(false);
    expect(tvmazeShowSchema.safeParse({ ...baseShow, id: 'uno' }).success).toBe(false);
  });

  it('valida la respuesta de búsqueda con score y show', () => {
    const parsed = tvmazeSearchResponseSchema.safeParse([{ score: 0.9, show: baseShow }]);

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data[0].show.name).toBe('Girls');
  });

  it('rechaza una respuesta de búsqueda con score inválido', () => {
    expect(tvmazeSearchResponseSchema.safeParse([{ score: 'alta', show: baseShow }]).success).toBe(
      false,
    );
  });

  it('acepta episodios y agenda con show embebido y hora nullable', () => {
    expect(tvmazeEpisodeSchema.safeParse({ id: 5, name: 'Pilot', season: 1, number: 1 }).success).toBe(
      true,
    );

    const parsed = tvmazeScheduleItemSchema.safeParse({
      id: 9,
      name: 'Pilot',
      season: 1,
      number: 1,
      airdate: '2026-10-05',
      airtime: null,
      show: baseShow,
    });

    expect(parsed.success).toBe(true);
  });
});
