import { describe, expect, it, vi } from 'vitest';

import type { TvmazeClient } from './client';
import { createTvmazeScheduleRepository } from './tvmaze-schedule.repository';

function createClient() {
  const get = vi.fn();
  const client: TvmazeClient = { get };
  return { client, get };
}

describe('TvmazeScheduleRepository', () => {
  it('consulta país y fecha y mapea la agenda con canal', async () => {
    const { client, get } = createClient();
    get.mockResolvedValueOnce([
      {
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
        },
      },
    ]);

    const repository = createTvmazeScheduleRepository(client);
    const entries = await repository.getByCountryAndDate('CO', '2026-10-05');

    expect(get).toHaveBeenCalledWith('/schedule?country=CO&date=2026-10-05', expect.anything());
    expect(entries).toEqual([
      {
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
      },
    ]);
  });
});
