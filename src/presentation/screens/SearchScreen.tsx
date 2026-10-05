import { useEffect, useRef, useState } from 'react';

import { MIN_SEARCH_LENGTH } from '@/application/use-cases/search-shows';
import { recordSearch } from '@/application/use-cases/record-search';
import { useDebouncedValue } from '@/presentation/hooks/queries/use-debounced-value';
import { EmptyState } from '@/presentation/components/EmptyState';
import { ErrorState } from '@/presentation/components/ErrorState';
import { HiddenResultsNote } from '@/presentation/components/HiddenResultsNote';
import { SearchInput } from '@/presentation/components/SearchInput';
import { ShowCard } from '@/presentation/components/ShowCard';
import { SkeletonCard } from '@/presentation/components/SkeletonCard';
import { SearchIcon } from '@/presentation/components/icons';
import { useDependencies } from '@/presentation/hooks/dependencies-context';
import { useFilteredShows } from '@/presentation/hooks/use-filtered-shows';
import { useShowSearch } from '@/presentation/hooks/queries/use-show-search';
import { useSlowLoading } from '@/presentation/hooks/queries/use-slow-loading';
import { currentTimezone, nowIso, randomId } from '@/shared/lib/clock';
import { formatTemplate } from '@/shared/lib/format';
import { useI18n } from '@/shared/i18n/i18n-context';

const SKELETON_COUNT = 6;

export function SearchScreen() {
  const { t } = useI18n();
  const deps = useDependencies();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query);
  const normalizedQuery = debouncedQuery.trim();
  const isQueryValid = normalizedQuery.length >= MIN_SEARCH_LENGTH;

  const { data, isPending, isFetching, isError, refetch } = useShowSearch(debouncedQuery);
  const isLoading = isQueryValid && isPending && isFetching;
  const isSlow = useSlowLoading(isLoading);

  const shows = data ?? [];
  const { visible, hiddenCount } = useFilteredShows(shows);
  const hasTyped = query.trim().length > 0;
  const isSettled = isQueryValid && !isLoading && !isError && data !== undefined;
  const recordedQueries = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isSettled || recordedQueries.current.has(normalizedQuery)) {
      return;
    }

    recordedQueries.current.add(normalizedQuery);
    void recordSearch(
      {
        history: deps.history,
        outbox: deps.outbox,
        now: nowIso,
        uuid: randomId,
        timezone: currentTimezone,
      },
      { query: normalizedQuery, resultCount: data.length },
    );
  }, [deps, isSettled, normalizedQuery, data]);

  return (
    <div className="space-y-4">
      <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.02em]">
        {t.screens.search.title}
      </h1>

      <SearchInput
        value={query}
        onChange={setQuery}
        label={t.screens.search.inputLabel}
        placeholder={t.screens.search.placeholder}
        clearLabel={t.common.clear}
      />

      <p aria-live="polite" className="min-h-5 text-sm text-muted">
        {isQueryValid && !isLoading && !isError && visible.length > 0
          ? `${visible.length} ${
              visible.length === 1 ? t.screens.search.resultsOne : t.screens.search.resultsMany
            } «${normalizedQuery}»`
          : ''}
      </p>

      {!isQueryValid ? (
        <EmptyState
          icon={<SearchIcon className="h-7 w-7" />}
          title={hasTyped ? t.screens.search.hintTitle : t.screens.search.emptyTitle}
          description={
            hasTyped ? t.screens.search.hintDescription : t.screens.search.emptyDescription
          }
        />
      ) : isLoading ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
          <p role="status" className="sr-only">
            {t.common.loading}
          </p>
          {isSlow && <p className="text-center text-xs text-muted">{t.common.slowLoading}</p>}
        </>
      ) : isError ? (
        <ErrorState
          message={t.screens.search.errorDescription}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : shows.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="h-7 w-7" />}
          title={formatTemplate(t.screens.search.noResultsTitle, { query: normalizedQuery })}
          description={t.screens.search.noResultsDescription}
        />
      ) : visible.length === 0 ? (
        <>
          <EmptyState
            icon={<SearchIcon className="h-7 w-7" />}
            title={t.filters.allHiddenTitle}
            description={t.filters.allHiddenDescription}
          />
          <HiddenResultsNote hiddenCount={hiddenCount} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visible.map((show) => (
              <ShowCard key={show.id} show={show} />
            ))}
          </div>
          <HiddenResultsNote hiddenCount={hiddenCount} />
        </>
      )}
    </div>
  );
}
