import { useState } from 'react';

import { MIN_SEARCH_LENGTH } from '@/application/use-cases/search-shows';
import { useDebouncedValue } from '@/presentation/hooks/queries/use-debounced-value';
import { EmptyState } from '@/presentation/components/EmptyState';
import { ErrorState } from '@/presentation/components/ErrorState';
import { SearchInput } from '@/presentation/components/SearchInput';
import { ShowCard } from '@/presentation/components/ShowCard';
import { SkeletonCard } from '@/presentation/components/SkeletonCard';
import { SearchIcon } from '@/presentation/components/icons';
import { useShowSearch } from '@/presentation/hooks/queries/use-show-search';
import { useSlowLoading } from '@/presentation/hooks/queries/use-slow-loading';
import { formatTemplate } from '@/shared/lib/format';
import { useI18n } from '@/shared/i18n/i18n-context';

const SKELETON_COUNT = 6;

export function SearchScreen() {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query);
  const normalizedQuery = debouncedQuery.trim();
  const isQueryValid = normalizedQuery.length >= MIN_SEARCH_LENGTH;

  const { data, isPending, isFetching, isError, refetch } = useShowSearch(debouncedQuery);
  const isLoading = isQueryValid && isPending && isFetching;
  const isSlow = useSlowLoading(isLoading);

  const shows = data ?? [];
  const hasTyped = query.trim().length > 0;

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
        {isQueryValid && !isLoading && !isError && shows.length > 0
          ? `${shows.length} ${
              shows.length === 1 ? t.screens.search.resultsOne : t.screens.search.resultsMany
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
          {isSlow && (
            <p className="text-center text-xs text-muted">{t.common.slowLoading}</p>
          )}
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
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {shows.map((show) => (
            <ShowCard key={show.id} show={show} />
          ))}
        </div>
      )}
    </div>
  );
}
