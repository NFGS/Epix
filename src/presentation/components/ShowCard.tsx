import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import type { Show } from '@/domain/entities/show';

import { StarIcon } from './icons';

const POSTER_SCRIM = 'linear-gradient(transparent, rgba(14, 13, 19, 0.85))';

interface ShowCardProps {
  show: Show;
  /** Acción superpuesta al póster (p. ej. quitar de favoritos). */
  action?: ReactNode;
}

export function ShowCard({ show, action }: ShowCardProps) {
  const meta = [show.year, show.genres[0]].filter((value) => value !== undefined).join(' · ');
  const hasAction = action !== undefined;

  return (
    <div className="group relative">
      <Link
        to={`/shows/${show.id}`}
        className="block transition-transform duration-150 ease-standard active:scale-[0.97]"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-surface-2">
          {show.imageUrl !== undefined ? (
            <img
              src={show.imageUrl}
              alt={show.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-150 ease-standard group-hover:scale-[1.03]"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-full w-full items-center justify-center text-4xl font-extrabold text-muted"
            >
              {show.name.charAt(0)}
            </span>
          )}

          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
            style={{ background: POSTER_SCRIM }}
          />

          {show.rating !== undefined && (
            <span
              className={[
                'absolute top-2 flex items-center gap-1 rounded-full bg-white/12 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-md',
                hasAction ? 'left-2' : 'right-2',
              ].join(' ')}
            >
              <StarIcon className="h-3 w-3" />
              {show.rating.toFixed(1)}
            </span>
          )}

          <h3 className="absolute inset-x-2.5 bottom-2 line-clamp-2 text-[15px] font-bold leading-tight text-white">
            {show.name}
          </h3>
        </div>

        {meta.length > 0 && (
          <p className="mt-1.5 truncate px-0.5 text-[13px] text-muted">{meta}</p>
        )}
      </Link>

      {hasAction && <div className="absolute right-2 top-2 z-10">{action}</div>}
    </div>
  );
}
