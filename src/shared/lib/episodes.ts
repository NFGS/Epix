import type { Episode } from '@/domain/entities/show';

export interface SeasonGroup {
  season: number;
  episodes: Episode[];
}

/** Agrupa episodios por temporada en orden ascendente (y por número dentro de cada una). */
export function groupEpisodesBySeason(episodes: readonly Episode[]): SeasonGroup[] {
  const bySeason = new Map<number, Episode[]>();

  for (const episode of episodes) {
    const bucket = bySeason.get(episode.season);
    if (bucket === undefined) {
      bySeason.set(episode.season, [episode]);
    } else {
      bucket.push(episode);
    }
  }

  return [...bySeason.entries()]
    .sort(([seasonA], [seasonB]) => seasonA - seasonB)
    .map(([season, seasonEpisodes]) => ({
      season,
      episodes: [...seasonEpisodes].sort((a, b) => a.number - b.number),
    }));
}
