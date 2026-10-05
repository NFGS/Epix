import type { Show } from '@/domain/entities/show';

export interface ShowRepository {
  search(query: string): Promise<Show[]>;
  getById(id: number): Promise<Show | null>;
}
