import { Link } from 'react-router-dom';

import type { ScheduleEntry } from '@/domain/entities/schedule-entry';
import { useI18n } from '@/shared/i18n/i18n-context';

const POSTER_SCRIM = 'linear-gradient(transparent, rgba(14, 13, 19, 0.85))';

interface ScheduleItemProps {
  entry: ScheduleEntry;
  showTime?: boolean;
}

function EpisodeMeta({ entry }: { entry: ScheduleEntry }) {
  const { t } = useI18n();

  return (
    <p className="mt-0.5 line-clamp-1 text-xs text-muted">
      {`T${entry.season} E${entry.number} · ${entry.episodeName}`}
      {entry.channel !== undefined && ` · ${entry.channel}`}
      {entry.airtime === undefined && ` · ${t.screens.schedule.noTime}`}
    </p>
  );
}

/** Fila compacta para listas de agenda agrupadas por hora. */
export function ScheduleItem({ entry, showTime = true }: ScheduleItemProps) {
  return (
    <Link
      to={`/shows/${entry.showId}`}
      className="flex items-center gap-3 rounded-xl px-1 py-2 transition-colors duration-150 hover:bg-surface-2 active:scale-[0.99]"
    >
      <div className="relative h-[66px] w-11 shrink-0 overflow-hidden rounded-lg bg-surface-2">
        {entry.showImageUrl !== undefined ? (
          <img
            src={entry.showImageUrl}
            alt=""
            width={44}
            height={66}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center text-sm font-bold text-muted"
          >
            {entry.showName.charAt(0)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-bold leading-tight">{entry.showName}</p>
        <EpisodeMeta entry={entry} />
      </div>

      {showTime && entry.airtime !== undefined && (
        <time
          dateTime={`${entry.airdate}T${entry.airtime}`}
          className="shrink-0 text-xs font-bold text-muted"
        >
          {entry.airtime.slice(0, 5)}
        </time>
      )}
    </Link>
  );
}

interface SchedulePosterCardProps {
  entry: ScheduleEntry;
  /** Tarjeta destacada (primera visible): prioriza su imagen para el LCP. */
  priority?: boolean;
}

/** Tarjeta de póster para la fila horizontal de «Hoy en TV». */
export function SchedulePosterCard({ entry, priority = false }: SchedulePosterCardProps) {
  return (
    <Link
      to={`/shows/${entry.showId}`}
      className="group block w-28 shrink-0 transition-transform duration-150 ease-standard active:scale-[0.97]"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-surface-2">
        {entry.showImageUrl !== undefined ? (
          <img
            src={entry.showImageUrl}
            alt={entry.showName}
            width={210}
            height={315}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center text-3xl font-extrabold text-muted"
          >
            {entry.showName.charAt(0)}
          </span>
        )}

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
          style={{ background: POSTER_SCRIM }}
        />

        {entry.airtime !== undefined && (
          <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-md">
            {entry.airtime.slice(0, 5)}
          </span>
        )}

        <h3 className="absolute inset-x-2.5 bottom-2 line-clamp-2 text-[13px] font-bold leading-tight text-white">
          {entry.showName}
        </h3>
      </div>
    </Link>
  );
}
