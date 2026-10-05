export interface Show {
  id: number;
  name: string;
  year?: number;
  status?: string;
  genres: string[];
  rating?: number;
  imageUrl?: string;
  summary?: string;
}

export interface Episode {
  id: number;
  name: string;
  season: number;
  number: number;
  airdate?: string;
}
