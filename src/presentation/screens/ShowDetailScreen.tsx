import { Link, useParams } from 'react-router-dom';

import type { Episode, Show } from '@/domain/entities/show';
import { EmptyState } from '@/presentation/components/EmptyState';
import { ErrorState } from '@/presentation/components/ErrorState';
import { FilmIcon, StarIcon } from '@/presentation/components/icons';
import { useShowDetail, useShowEpisodes } from '@/presentation/hooks/queries/use-show-detail';
import { useSlowLoading } from '@/presentation/hooks/queries/use-slow-loading';
import type { Dictionary } from '@/shared/i18n/dictionaries';
import { formatTemplate } from '@/shared/lib/format';
import { groupEpisodesBySeason } from '@/shared/lib/episodes';
import { useI18n } from '@/shared/i18n/i18n-context';

const HERO_SCRIM = 'linear-gradient(transparent 25%, rgba(14, 13, 19, 0.92))';
const EPISODE_SKELETON_COUNT = 3;

function statusLabel(status: string | undefined, t: Dictionary): string | undefined {
  switch (status?.toLowerCase()) {
    case 'running':
      return t.screens.detail.statusRunning;
    case 'ended':
      return t.screens.detail.statusEnded;
    case 'to be determined':
      return t.screens.detail.statusTbd;
    case 'in development':
      return t.screens.detail.statusInDevelopment;
    default:
      return status;
  }
}

function HeroInfo({ show, overlay }: { show: Show; overlay: boolean }) {
  const { t } = useI18n();
  const status = statusLabel(show.status, t);
  const metaItems = [
    ...(show.year !== undefined ? [String(show.year)] : []),
    ...(status !== undefined ? [status] : []),
  ];

  return (
    <>
      <h1
        className={[
          'line-clamp-2 text-[28px] font-extrabold leading-[1.05] tracking-[-0.02em]',
          overlay ? 'text-white' : 'text-fg',
        ].join(' ')}
      >
        {show.name}
      </h1>

      {(metaItems.length > 0 || show.rating !== undefined) && (
        <div
          className={[
            'mt-2 flex flex-wrap items-center gap-2 text-[13px]',
            overlay ? 'text-white/75' : 'text-muted',
          ].join(' ')}
        >
          {metaItems.length > 0 && <span>{metaItems.join(' · ')}</span>}
          {show.rating !== undefined && (
            <span
              className={[
                'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold backdrop-blur-md',
                overlay ? 'bg-white/12 text-white' : 'bg-fg/10 text-fg',
              ].join(' ')}
            >
              <StarIcon className="h-3 w-3" />
              {show.rating.toFixed(1)}
            </span>
          )}
        </div>
      )}

      {show.genres.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {show.genres.map((genre) => (
            <li
              key={genre}
              className={[
                'rounded-full border px-2.5 py-0.5 text-xs font-medium',
                overlay ? 'border-white/25 text-white/80' : 'border-border text-muted',
              ].join(' ')}
            >
              {genre}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ShowHero({ show }: { show: Show }) {
  if (show.imageUrl !== undefined) {
    return (
      <section className="relative overflow-hidden rounded-2xl bg-surface-2">
        <img src={show.imageUrl} alt="" className="h-80 w-full object-cover object-top" />
        <div className="absolute inset-0" style={{ background: HERO_SCRIM }} />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <HeroInfo show={show} overlay />
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-2xl bg-surface-2 p-4">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-2 -top-8 text-[120px] font-extrabold leading-none text-fg/5"
      >
        {show.name.charAt(0)}
      </span>
      <div className="relative">
        <HeroInfo show={show} overlay={false} />
      </div>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="h-80 w-full animate-pulse rounded-2xl bg-surface-2" />
      <div className="space-y-2">
        <div className="h-4 w-1/3 animate-pulse rounded-full bg-surface-2" />
        <div className="h-3 w-full animate-pulse rounded-full bg-surface-2" />
        <div className="h-3 w-5/6 animate-pulse rounded-full bg-surface-2" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: EPISODE_SKELETON_COUNT }, (_, index) => (
          <div key={index} className="h-12 w-full animate-pulse rounded-xl bg-surface-2" />
        ))}
      </div>
    </div>
  );
}

function EpisodeList({ episodes }: { episodes: Episode[] }) {
  const { t } = useI18n();

  if (episodes.length === 0) {
    return <p className="text-sm text-muted">{t.screens.detail.episodesEmpty}</p>;
  }

  const seasons = groupEpisodesBySeason(episodes);

  return (
    <div className="space-y-5">
      {seasons.map(({ season, episodes: seasonEpisodes }) => (
        <section key={season}>
          <h3 className="text-xs font-bold uppercase tracking-[1.4px] text-muted">
            {formatTemplate(t.screens.detail.season, { season })}
          </h3>
          <ol className="mt-1 divide-y divide-border">
            {seasonEpisodes.map((episode) => (
              <li key={episode.id} className="flex items-baseline justify-between gap-3 py-2.5">
                <p className="min-w-0 text-sm">
                  <span className="text-muted">
                    T{episode.season} E{episode.number}
                  </span>{' '}
                  <span className="font-medium">{episode.name}</span>
                </p>
                {episode.airdate !== undefined && (
                  <time dateTime={episode.airdate} className="shrink-0 text-xs text-muted">
                    {episode.airdate}
                  </time>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

export function ShowDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const showId = Number(id);
  const isValidId = Number.isInteger(showId) && showId > 0;

  const showQuery = useShowDetail(showId);
  const episodesQuery = useShowEpisodes(showId);

  const isShowLoading = isValidId && showQuery.isPending && showQuery.isFetching;
  const isEpisodesLoading =
    isValidId && episodesQuery.isPending && episodesQuery.isFetching;

  const show = showQuery.data ?? null;

  if (!isValidId || (!isShowLoading && !showQuery.isError && show === null)) {
    return (
      <div className="py-6">
        <EmptyState
          icon={<FilmIcon className="h-7 w-7" />}
          title={t.screens.detail.notFoundTitle}
          description={t.screens.detail.notFoundDescription}
          action={
            <Link
              to="/search"
              className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-xs font-bold uppercase tracking-[1.4px] text-white transition-colors duration-150 hover:bg-accent-hover"
            >
              {t.screens.detail.backToSearch}
            </Link>
          }
        />
      </div>
    );
  }

  if (isShowLoading) {
    return <DetailSkeleton />;
  }

  if (showQuery.isError || show === null) {
    return (
      <ErrorState
        message={t.screens.detail.errorDescription}
        onRetry={() => {
          void showQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <ShowHero show={show} />

      {show.summary !== undefined && (
        <p className="text-base leading-relaxed text-fg">{show.summary}</p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t.screens.detail.episodes}</h2>

        {isEpisodesLoading ? (
          <div className="space-y-3" aria-hidden="true">
            {Array.from({ length: EPISODE_SKELETON_COUNT }, (_, index) => (
              <div key={index} className="h-12 w-full animate-pulse rounded-xl bg-surface-2" />
            ))}
          </div>
        ) : episodesQuery.isError ? (
          <ErrorState
            message={t.screens.detail.episodesError}
            onRetry={() => {
              void episodesQuery.refetch();
            }}
          />
        ) : (
          <EpisodeList episodes={episodesQuery.data ?? []} />
        )}

        {isEpisodesLoading && <EpisodesSlowNotice />}
      </section>
    </div>
  );
}

function EpisodesSlowNotice() {
  const { t } = useI18n();
  const isSlow = useSlowLoading(true);

  if (!isSlow) {
    return null;
  }

  return <p className="text-center text-xs text-muted">{t.common.slowLoading}</p>;
}
