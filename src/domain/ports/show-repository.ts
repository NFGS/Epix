import type { Episode, Show } from '@/domain/entities/show';

export interface ShowRepository {
  search(query: string): Promise<Show[]>;
  getById(id: number): Promise<Show | null>;
  getEpisodes(showId: number): Promise<Episode[]>;
  /** Próximo episodio de la serie según TVmaze (`embed=nextepisode`), o `null`. */
  getNextEpisode(showId: number): Promise<Episode | null>;
}
