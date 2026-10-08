import { describe, expect, it, vi } from 'vitest';

import { createTvmazeClient, TvmazeHttpError, type TvmazeClient } from './client';
import { createTvmazeScheduleRepository } from './tvmaze-schedule.repository';

const SCHEDULE_ITEM = {
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
};

function createClient() {
  const get = vi.fn();
  const client: TvmazeClient = { get };
  return { client, get };
}

describe('TvmazeScheduleRepository', () => {
  it('consulta país y fecha en el proxy de mismo origen y mapea la agenda con canal', async () => {
    const { client, get } = createClient();
    get.mockResolvedValueOnce([SCHEDULE_ITEM]);

    const repository = createTvmazeScheduleRepository(client);
    const entries = await repository.getByCountryAndDate('CO', '2026-10-05');

    expect(get).toHaveBeenCalledWith('/api/schedule?country=CO&date=2026-10-05', expect.anything());
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

  it('canonicaliza el país a mayúsculas para compartir clave de caché (P-13)', async () => {
    const { client, get } = createClient();
    get.mockResolvedValueOnce([]);

    const repository = createTvmazeScheduleRepository(client);
    await repository.getByCountryAndDate(' co ', '2026-10-05');

    expect(get).toHaveBeenCalledWith('/api/schedule?country=CO&date=2026-10-05', expect.anything());
  });

  it('pide la agenda al proxy de mismo origen sin base remota', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify([SCHEDULE_ITEM]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const client = createTvmazeClient({ baseUrl: '', fetchFn, sleepFn: vi.fn(async () => {}) });
    const repository = createTvmazeScheduleRepository(client);

    await repository.getByCountryAndDate('CO', '2026-10-05');

    expect(fetchFn).toHaveBeenCalledWith(
      '/api/schedule?country=CO&date=2026-10-05',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  it('propaga los errores del cliente', async () => {
    const { client, get } = createClient();
    get.mockRejectedValueOnce(new TvmazeHttpError(502));

    const repository = createTvmazeScheduleRepository(client);

    await expect(repository.getByCountryAndDate('CO', '2026-10-05')).rejects.toBeInstanceOf(
      TvmazeHttpError,
    );
  });
});
