import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useState } from 'react';

import { toggleFavorite } from '@/application/use-cases/toggle-favorite';
import type { FavoriteShow } from '@/domain/entities/favorite';
import type { Show } from '@/domain/entities/show';
import { nowIso, randomId } from '@/shared/lib/clock';

import { useDependencies } from './dependencies-context';

/** Favoritos activos en vivo (se actualiza al instante con IndexedDB). */
export function useFavorites(): FavoriteShow[] | undefined {
  const { favorites } = useDependencies();
  return useLiveQuery(() => favorites.list(), [favorites], undefined);
}

/** `true` si la serie está en favoritos; se mantiene en vivo. */
export function useIsFavorite(showId: number | null): boolean {
  const { favorites } = useDependencies();

  const isFavorite = useLiveQuery(
    async () => (showId === null ? false : (await favorites.get(showId)) !== null),
    [favorites, showId],
    false,
  );

  return isFavorite ?? false;
}

/** Alterna el favorito con estado de carga para el botón (check + outbox). */
export function useToggleFavorite(show: Show | null) {
  const deps = useDependencies();
  const isFavorite = useIsFavorite(show?.id ?? null);
  const [isPending, setIsPending] = useState(false);

  const toggle = useCallback(async () => {
    if (show === null) {
      return;
    }

    setIsPending(true);
    try {
      const isNowFavorite = await toggleFavorite(
        {
          favorites: deps.favorites,
          outbox: deps.outbox,
          now: nowIso,
          uuid: randomId,
        },
        show,
      );
      void deps.telemetry.track(isNowFavorite ? 'favorite_add' : 'favorite_remove', {
        showId: show.id,
      });
    } finally {
      setIsPending(false);
    }
  }, [deps, show]);

  return { isFavorite, isPending, toggle };
}
