export interface TvmazeImageFixture {
  medium: string | null;
  original: string | null;
}

export interface TvmazeChannelFixture {
  id: number;
  name: string;
}

export interface TvmazeShowFixture {
  id: number;
  name: string;
  genres: string[];
  premiered: string;
  rating: { average: number };
  image: TvmazeImageFixture;
  summary: string;
  status: string;
  network: TvmazeChannelFixture | null;
  webChannel: TvmazeChannelFixture | null;
}

export interface TvmazeEpisodeFixture {
  id: number;
  name: string;
  season: number;
  number: number;
  airdate: string;
}

export interface TvmazeSearchResultFixture {
  score: number;
  show: TvmazeShowFixture;
}

export interface TvmazeCastFixture {
  person: { id: number; name: string };
  character: { id: number; name: string };
}

export interface TvmazeScheduleItemFixture {
  id: number;
  name: string;
  season: number;
  number: number;
  airdate: string;
  airtime: string;
  show: TvmazeShowFixture;
}

function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function poster(showId: number): TvmazeImageFixture {
  return {
    medium: `https://static.tvmaze.com/uploads/images/medium_portrait/${showId}/poster.jpg`,
    original: `https://static.tvmaze.com/uploads/images/original_untouched/${showId}/poster.jpg`,
  };
}

export const TODAY_ISO = localToday();

export const gilmoreGirlsFixture: TvmazeShowFixture = {
  id: 250,
  name: 'Gilmore Girls',
  genres: ['Drama', 'Comedy'],
  premiered: '2000-10-05',
  rating: { average: 8.2 },
  image: poster(250),
  summary:
    '<p>Lorelai y Rory Gilmore viven en el pintoresco pueblo de Stars Hollow, donde madre e hija enfrentan juntas cada etapa de la vida.</p>',
  status: 'Ended',
  network: { id: 5, name: 'The WB' },
  webChannel: null,
};

export const girlsFixture: TvmazeShowFixture = {
  id: 251,
  name: 'Girls',
  genres: ['Drama', 'Romance'],
  premiered: '2012-04-15',
  rating: { average: 7.1 },
  image: poster(251),
  summary:
    '<p>Cuatro amigas veinteañeras intentan encontrar su lugar en Nueva York mientras descubren quiénes son.</p>',
  status: 'Ended',
  network: null,
  webChannel: { id: 3, name: 'HBO' },
};

export const riverdaleFixture: TvmazeShowFixture = {
  id: 252,
  name: 'Riverdale',
  genres: ['Drama', 'Mystery'],
  premiered: '2017-01-26',
  rating: { average: 7.0 },
  image: poster(252),
  summary: '<p>Archie y sus amigos enfrentan los misterios del pueblo de Riverdale.</p>',
  status: 'Ended',
  network: { id: 6, name: 'The CW' },
  webChannel: null,
};

export const theOfficeFixture: TvmazeShowFixture = {
  id: 253,
  name: 'The Office',
  genres: ['Comedy'],
  premiered: '2005-03-24',
  rating: { average: 9.0 },
  image: poster(253),
  summary: '<p>La vida laboral de los empleados de la oficina de Dunder Mifflin.</p>',
  status: 'Ended',
  network: { id: 1, name: 'NBC' },
  webChannel: null,
};

export const showsFixture: Readonly<Record<number, TvmazeShowFixture>> = {
  250: gilmoreGirlsFixture,
  251: girlsFixture,
  252: riverdaleFixture,
  253: theOfficeFixture,
};

export const searchGirlsResultsFixture: TvmazeSearchResultFixture[] = [
  { score: 0.94, show: gilmoreGirlsFixture },
  { score: 0.82, show: girlsFixture },
];

export const episodesByShowFixture: Readonly<Record<number, TvmazeEpisodeFixture[]>> = {
  250: [
    { id: 5001, name: 'Pilot', season: 1, number: 1, airdate: '2000-10-05' },
    {
      id: 5002,
      name: 'The Lorelais First Day at Chilton',
      season: 1,
      number: 2,
      airdate: '2000-10-12',
    },
    { id: 5003, name: 'Sadie, Sadie', season: 2, number: 1, airdate: '2001-10-09' },
  ],
  251: [{ id: 5101, name: 'Pilot', season: 1, number: 1, airdate: '2012-04-15' }],
};

export const castByShowFixture: Readonly<Record<number, TvmazeCastFixture[]>> = {
  250: [
    {
      person: { id: 9001, name: 'Lauren Graham' },
      character: { id: 8001, name: 'Lorelai Gilmore' },
    },
    { person: { id: 9002, name: 'Alexis Bledel' }, character: { id: 8002, name: 'Rory Gilmore' } },
  ],
  251: [
    {
      person: { id: 9101, name: 'Lena Dunham' },
      character: { id: 8101, name: 'Hannah Horvath' },
    },
  ],
};

export const nextEpisodeByShowFixture: Readonly<Record<number, TvmazeEpisodeFixture | null>> = {
  250: { id: 5201, name: 'A Year in the Life', season: 1, number: 1, airdate: TODAY_ISO },
  251: null,
};

export const scheduleFixture: TvmazeScheduleItemFixture[] = [
  {
    id: 6001,
    name: 'Chapter One',
    season: 1,
    number: 1,
    airdate: TODAY_ISO,
    airtime: '20:00',
    show: riverdaleFixture,
  },
  {
    id: 6002,
    name: 'Pilot',
    season: 1,
    number: 1,
    airdate: TODAY_ISO,
    airtime: '21:30',
    show: theOfficeFixture,
  },
];

const EMPTY_EPISODES: TvmazeEpisodeFixture[] = [];
const EMPTY_CAST: TvmazeCastFixture[] = [];

export function showDetailFixture(showId: number):
  | (TvmazeShowFixture & {
      _embedded: { episodes: TvmazeEpisodeFixture[]; cast: TvmazeCastFixture[] };
    })
  | null {
  const show = showsFixture[showId];
  if (show === undefined) {
    return null;
  }

  return {
    ...show,
    _embedded: {
      episodes: episodesByShowFixture[showId] ?? EMPTY_EPISODES,
      cast: castByShowFixture[showId] ?? EMPTY_CAST,
    },
  };
}

export function showWithNextEpisodeFixture(
  showId: number,
): (TvmazeShowFixture & { _embedded: { nextepisode: TvmazeEpisodeFixture | null } }) | null {
  const show = showsFixture[showId];
  if (show === undefined) {
    return null;
  }

  return {
    ...show,
    _embedded: { nextepisode: nextEpisodeByShowFixture[showId] ?? null },
  };
}
