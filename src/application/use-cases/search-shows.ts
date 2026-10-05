import type { Show } from '@/domain/entities/show';
import type { ShowRepository } from '@/domain/ports/show-repository';

export const MIN_SEARCH_LENGTH = 3;

/**
 * Normaliza la consulta y delega en el repositorio.
 * Las consultas demasiado cortas no llegan a la red: devuelven lista vacía.
 */
export async function searchShows(repository: ShowRepository, query: string): Promise<Show[]> {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < MIN_SEARCH_LENGTH) {
    return [];
  }

  return repository.search(normalizedQuery);
}
