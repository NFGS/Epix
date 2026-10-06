import { Link } from 'react-router-dom';

import { EmptyState } from '@/presentation/components/EmptyState';
import { ErrorState } from '@/presentation/components/ErrorState';
import { HiddenResultsNote } from '@/presentation/components/HiddenResultsNote';
import { SchedulePosterCard } from '@/presentation/components/ScheduleItem';
import { TvIcon } from '@/presentation/components/icons';
import { useSchedule } from '@/presentation/hooks/queries/use-schedule';
import { useSlowLoading } from '@/presentation/hooks/queries/use-slow-loading';
import { useFilteredShows } from '@/presentation/hooks/use-filtered-shows';
import { useScheduleCountry } from '@/presentation/hooks/use-schedule-country';
import { formatTemplate } from '@/shared/lib/format';
import { SCHEDULE_COUNTRIES } from '@/shared/lib/locale';
import { todayIso } from '@/shared/lib/date';
import { useI18n } from '@/shared/i18n/i18n-context';

const POSTER_SKELETON_COUNT = 4;

export function HomeScreen() {
  const { t } = useI18n();
  const { country } = useScheduleCountry();
  const date = todayIso();

  const { data, isPending, isFetching, isError, refetch } = useSchedule(country, date);
  const isLoading = isPending && isFetching;
  const isSlow = useSlowLoading(isLoading);

  const entries = data ?? [];
  const { visible, hiddenCount } = useFilteredShows(entries);
  const countryName = SCHEDULE_COUNTRIES.find(({ code }) => code === country)?.name ?? country;

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.02em]">
          {t.screens.home.title}
        </h1>
        <p className="text-sm text-muted">
          {formatTemplate(t.screens.home.regionNote, { country: countryName })}
        </p>
        <Link
          to="/search"
          className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-xs font-bold uppercase tracking-[1.4px] text-white transition-colors duration-150 hover:bg-accent-hover"
        >
          {t.screens.home.ctaSearch}
        </Link>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t.screens.home.sectionTitle}</h2>

        {isLoading ? (
          <div className="-mx-4 flex gap-3 overflow-hidden px-4" aria-hidden="true">
            {Array.from({ length: POSTER_SKELETON_COUNT }, (_, index) => (
              <div key={index} className="w-28 shrink-0">
                <div className="aspect-[2/3] w-full animate-pulse rounded-xl bg-surface-2" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            message={t.screens.home.errorDescription}
            onRetry={() => {
              void refetch();
            }}
          />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<TvIcon className="h-7 w-7" />}
            title={t.screens.home.emptyTitle}
            description={t.screens.home.emptyDescription}
          />
        ) : visible.length === 0 ? (
          <>
            <EmptyState
              icon={<TvIcon className="h-7 w-7" />}
              title={t.filters.allHiddenTitle}
              description={t.filters.allHiddenDescription}
            />
            <HiddenResultsNote hiddenCount={hiddenCount} />
          </>
        ) : (
          <>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {visible.map((entry, index) => (
                <SchedulePosterCard
                  key={entry.episodeId}
                  entry={entry}
                  priority={index === 0}
                />
              ))}
            </div>
            <HiddenResultsNote hiddenCount={hiddenCount} />
          </>
        )}

        {isLoading && (
          <p role="status" className="sr-only">
            {t.common.loading}
          </p>
        )}
        {isLoading && isSlow && (
          <p className="text-center text-xs text-muted">{t.common.slowLoading}</p>
        )}
      </section>
    </div>
  );
}
