import { Link } from 'react-router-dom';

import type { Show } from '@/domain/entities/show';
import { useI18n } from '@/shared/i18n/i18n-context';

interface ShowCardProps {
  show: Show;
  showDemoBadge?: boolean;
}

export function ShowCard({ show, showDemoBadge = false }: ShowCardProps) {
  const { t } = useI18n();

  return (
    <Link
      to={`/shows/${show.id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-surface shadow-card transition-transform hover:-translate-y-0.5"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        {show.imageUrl ? (
          <img
            src={show.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800"
          >
            <span className="text-4xl font-black text-white/90">{show.name.charAt(0)}</span>
          </div>
        )}

        {show.rating !== undefined && (
          <span className="absolute right-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-semibold text-accent-300">
            ★ {show.rating.toFixed(1)}
          </span>
        )}

        {showDemoBadge && (
          <span className="absolute left-2 top-2 rounded-md bg-accent-500/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-950">
            {t.common.demo}
          </span>
        )}
      </div>

      <div className="p-2.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{show.name}</h3>
        {show.year !== undefined && <p className="mt-0.5 text-xs text-muted">{show.year}</p>}
        {show.genres.length > 0 && (
          <ul className="mt-1.5 flex flex-wrap gap-1">
            {show.genres.slice(0, 2).map((genre) => (
              <li
                key={genre}
                className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted"
              >
                {genre}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}
