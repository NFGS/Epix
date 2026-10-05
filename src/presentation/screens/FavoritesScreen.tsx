import { Link } from 'react-router-dom';

import type { FavoriteShow } from '@/domain/entities/favorite';
import type { Show } from '@/domain/entities/show';
import { EmptyState } from '@/presentation/components/EmptyState';
import { ShowCard } from '@/presentation/components/ShowCard';
import { SkeletonCard } from '@/presentation/components/SkeletonCard';
import { CloudOffIcon, HeartFilledIcon, HeartIcon } from '@/presentation/components/icons';
import { useFavorites, useToggleFavorite } from '@/presentation/hooks/use-favorites';
import { useI18n } from '@/shared/i18n/i18n-context';

const FAVORITES_SKELETON_COUNT = 4;

function toShow(favorite: FavoriteShow): Show {
  return {
    id: favorite.showId,
    name: favorite.name,
    genres: favorite.genres,
    year: favorite.premiered,
    rating: favorite.rating,
    imageUrl: favorite.imageMedium,
  };
}

function RemoveFavoriteButton({ show }: { show: Show }) {
  const { t } = useI18n();
  const { isPending, toggle } = useToggleFavorite(show);

  return (
    <button
      type="button"
      aria-label={t.screens.favorites.remove}
      aria-busy={isPending}
      disabled={isPending}
      onClick={() => {
        void toggle();
      }}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-transform duration-150 ease-standard hover:bg-black/65 active:scale-95 disabled:opacity-70"
    >
      {isPending ? (
        <span
          aria-hidden="true"
          className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
        />
      ) : (
        <HeartFilledIcon className="h-5 w-5" />
      )}
    </button>
  );
}

export function FavoritesScreen() {
  const { t } = useI18n();
  const favorites = useFavorites();

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.02em]">
          {t.screens.favorites.title}
        </h1>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <CloudOffIcon className="h-4 w-4" />
          {t.screens.favorites.offlineNote}
        </p>
      </div>

      {favorites === undefined ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-hidden="true">
          {Array.from({ length: FAVORITES_SKELETON_COUNT }, (_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <EmptyState
          icon={<HeartIcon className="h-7 w-7" />}
          title={t.screens.favorites.emptyTitle}
          description={t.screens.favorites.emptyDescription}
          action={
            <Link
              to="/search"
              className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-xs font-bold uppercase tracking-[1.4px] text-white transition-colors duration-150 hover:bg-accent-hover"
            >
              {t.screens.favorites.emptyCta}
            </Link>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {favorites.map((favorite) => {
            const show = toShow(favorite);

            return (
              <li key={favorite.showId}>
                <ShowCard show={show} action={<RemoveFavoriteButton show={show} />} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
