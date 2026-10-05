import { useState } from 'react';
import { Link } from 'react-router-dom';

import { clearHistory } from '@/application/use-cases/clear-history';
import { ConfirmDialog } from '@/presentation/components/ConfirmDialog';
import { EmptyState } from '@/presentation/components/EmptyState';
import { ClockIcon, SearchIcon, TrashIcon } from '@/presentation/components/icons';
import { useDependencies } from '@/presentation/hooks/dependencies-context';
import { useHistory } from '@/presentation/hooks/use-history';
import { nowIso, randomId } from '@/shared/lib/clock';
import { formatRelativeDate, formatTemplate } from '@/shared/lib/format';
import { useI18n } from '@/shared/i18n/i18n-context';

const HISTORY_SKELETON_COUNT = 3;

export function HistoryScreen() {
  const { t, language } = useI18n();
  const deps = useDependencies();
  const { views, searches } = useHistory();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [clearStatus, setClearStatus] = useState<'idle' | 'cleared' | 'error'>('idle');

  const isLoading = views === undefined || searches === undefined;
  const hasHistory = (views?.length ?? 0) + (searches?.length ?? 0) > 0;
  const dateLabels = { today: t.common.today, yesterday: t.common.yesterday };

  const handleConfirmClear = () => {
    setIsDialogOpen(false);
    setClearStatus('idle');

    void clearHistory({
      history: deps.history,
      outbox: deps.outbox,
      hasRemote: deps.adapter !== null,
      now: nowIso,
      uuid: randomId,
    })
      .then(() => {
        setClearStatus('cleared');
      })
      .catch(() => {
        // R-09: el fallo se muestra en pantalla; nunca queda sin manejar.
        setClearStatus('error');
      });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.02em]">
          {t.screens.history.title}
        </h1>

        {hasHistory && (
          <button
            type="button"
            onClick={() => {
              setIsDialogOpen(true);
            }}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-surface-2 px-4 text-xs font-bold uppercase tracking-[1.4px] text-fg transition-colors duration-150 hover:text-danger"
          >
            <TrashIcon className="h-4 w-4" />
            {t.screens.history.clearAction}
          </button>
        )}
      </div>

      {clearStatus !== 'idle' && (
        <p
          role="status"
          aria-live="polite"
          className={['text-xs', clearStatus === 'cleared' ? 'text-success' : 'text-danger'].join(' ')}
        >
          {clearStatus === 'cleared' ? t.screens.history.cleared : t.screens.history.clearError}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: HISTORY_SKELETON_COUNT }, (_, index) => (
            <div key={index} className="h-12 w-full animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      ) : !hasHistory ? (
        <EmptyState
          icon={<ClockIcon className="h-7 w-7" />}
          title={t.screens.history.emptyTitle}
          description={t.screens.history.emptyDescription}
        />
      ) : (
        <>
          {views !== undefined && views.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-[1.4px] text-muted">
                {t.screens.history.viewsTitle}
              </h2>
              <ul className="divide-y divide-border">
                {views.map((entry) => {
                  const row = (
                    <>
                      <span className="min-w-0 truncate text-sm font-medium">
                        {entry.showName ?? ''}
                      </span>
                      <time dateTime={entry.occurredAt} className="shrink-0 text-xs text-muted">
                        {formatRelativeDate(entry.occurredAt, dateLabels, { language })}
                      </time>
                    </>
                  );

                  return (
                    <li key={entry.id ?? `${entry.showId}-${entry.occurredAt}`}>
                      {entry.showId !== undefined ? (
                        <Link
                          to={`/shows/${entry.showId}`}
                          className="flex min-h-11 items-center justify-between gap-3 py-2.5"
                        >
                          {row}
                        </Link>
                      ) : (
                        <div className="flex min-h-11 items-center justify-between gap-3 py-2.5">
                          {row}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {searches !== undefined && searches.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-[1.4px] text-muted">
                {t.screens.history.searchesTitle}
              </h2>
              <ul className="divide-y divide-border">
                {searches.map((entry) => (
                  <li
                    key={entry.id ?? `${entry.query}-${entry.occurredAt}`}
                    className="flex min-h-11 items-center justify-between gap-3 py-2.5"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <SearchIcon className="h-4 w-4 shrink-0 text-muted" />
                      <span className="min-w-0 truncate text-sm font-medium">{entry.query}</span>
                      <span className="shrink-0 text-xs text-muted">
                        {formatTemplate(
                          entry.resultCount === 1
                            ? t.screens.history.resultsOne
                            : t.screens.history.resultsMany,
                          { count: entry.resultCount },
                        )}
                      </span>
                    </span>
                    <time dateTime={entry.occurredAt} className="shrink-0 text-xs text-muted">
                      {formatRelativeDate(entry.occurredAt, dateLabels, { language })}
                    </time>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <ConfirmDialog
        open={isDialogOpen}
        title={t.screens.history.confirmTitle}
        description={t.screens.history.confirmDescription}
        confirmLabel={t.screens.history.confirmAction}
        cancelLabel={t.common.cancel}
        onConfirm={handleConfirmClear}
        onCancel={() => {
          setIsDialogOpen(false);
        }}
      />
    </div>
  );
}
