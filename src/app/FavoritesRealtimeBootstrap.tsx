import { useEffect } from 'react';

import { startFavoritesRealtime } from '@/infrastructure/sync/favorites-realtime';
import { useDependencies } from '@/presentation/hooks/dependencies-context';
import { useAccount } from '@/presentation/hooks/use-account';
import { logger } from '@/shared/lib/logger';

/**
 * Mantiene la suscripción Realtime de `public.favorites` del usuario activo:
 * un cambio hecho en otro dispositivo o pestaña llega aquí, se aplica a Dexie
 * con LWW y `useLiveQuery` refresca la UI sola.
 */
export function FavoritesRealtimeBootstrap() {
  const { adapter, db, favorites } = useDependencies();
  const { state } = useAccount();
  const userId =
    state?.status === 'anonymous' || state?.status === 'linked' ? state.userId : null;

  useEffect(() => {
    if (adapter === null || userId === null) {
      return;
    }

    return startFavoritesRealtime({
      adapter,
      userId,
      repoFavorites: favorites,
      getLocalFavorite: (showId) => db.favorites.get(showId),
      onError: (error) => {
        logger.warn('Epix: evento de Realtime de favoritos descartado.', error);
      },
    });
  }, [adapter, db, favorites, userId]);

  return null;
}
