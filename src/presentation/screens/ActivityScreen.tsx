import { useMemo, useState } from 'react';

import { clearUsageEvents } from '@/application/use-cases/clear-usage-events';
import type { UsageEvent, UsageEventType, UsageEventValue } from '@/domain/entities/usage-event';
import { ConfirmDialog } from '@/presentation/components/ConfirmDialog';
import { EmptyState } from '@/presentation/components/EmptyState';
import {
  ActivityIcon,
  BellIcon,
  ClockIcon,
  FilmIcon,
  FilterIcon,
  GlobeIcon,
  HeartIcon,
  LocationIcon,
  RefreshIcon,
  SearchIcon,
  TrashIcon,
  TvIcon,
  UserIcon,
} from '@/presentation/components/icons';
import { useDependencies } from '@/presentation/hooks/dependencies-context';
import { useUsageEvents } from '@/presentation/hooks/use-usage-events';
import { nowIso, randomId } from '@/shared/lib/clock';
import type { Dictionary, Language } from '@/shared/i18n/dictionaries';
import { formatRelativeDate, formatTemplate } from '@/shared/lib/format';
import { useI18n } from '@/shared/i18n/i18n-context';

const ACTIVITY_SKELETON_COUNT = 3;

interface DayGroup {
  key: string;
  label: string;
  events: UsageEvent[];
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

function dayLabel(date: Date, language: Language, labels: Dictionary['common']): string {
  const now = new Date();

  if (isSameDay(date, now)) {
    return labels.today;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, yesterday)) {
    return labels.yesterday;
  }

  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es', {
    dateStyle: 'long',
  }).format(date);
}

/** Agrupa por día local conservando el orden (más reciente primero). */
function groupByDay(
  events: readonly UsageEvent[],
  language: Language,
  labels: Dictionary['common'],
): DayGroup[] {
  const groups = new Map<string, DayGroup>();

  for (const event of events) {
    const date = new Date(event.occurredAt);
    const key = Number.isNaN(date.getTime()) ? event.occurredAt : dayKey(date);
    const existing = groups.get(key);

    if (existing === undefined) {
      groups.set(key, {
        key,
        label: Number.isNaN(date.getTime()) ? event.occurredAt : dayLabel(date, language, labels),
        events: [event],
      });
    } else {
      existing.events.push(event);
    }
  }

  return [...groups.values()];
}

function EventIcon({ type }: { type: UsageEventType }) {
  switch (type) {
    case 'search':
      return <SearchIcon className="h-4 w-4" />;
    case 'show_open':
    case 'episode_list_open':
      return <FilmIcon className="h-4 w-4" />;
    case 'favorite_add':
    case 'favorite_remove':
      return <HeartIcon className="h-4 w-4" />;
    case 'screen_view':
      return <TvIcon className="h-4 w-4" />;
    case 'session_start':
    case 'session_end':
      return <UserIcon className="h-4 w-4" />;
    case 'gps_used':
      return <LocationIcon className="h-4 w-4" />;
    case 'notification_permission':
    case 'notification_shown':
    case 'notification_open':
      return <BellIcon className="h-4 w-4" />;
    case 'sync_success':
    case 'sync_error':
      return <RefreshIcon className="h-4 w-4" />;
    case 'filter_change':
      return <FilterIcon className="h-4 w-4" />;
    case 'preference_change':
    case 'theme_change':
      return <GlobeIcon className="h-4 w-4" />;
    default:
      return <ClockIcon className="h-4 w-4" />;
  }
}

function payloadText(value: UsageEventValue | undefined): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const parts = value.filter((item): item is string => typeof item === 'string');
    return parts.length > 0 ? parts.join(', ') : null;
  }

  return null;
}

function fieldLabel(field: string, t: Dictionary): string {
  switch (field) {
    case 'genres':
      return t.screens.profile.favoriteGenres;
    case 'maxAgeRating':
      return t.screens.profile.maxAge;
    case 'theme':
      return t.screens.profile.theme;
    case 'language':
      return t.screens.profile.language;
    case 'country':
      return t.screens.schedule.countryLabel;
    default:
      return field;
  }
}

/** Resumen humano y corto del payload; `null` si no aporta nada. */
function summarize(event: UsageEvent, t: Dictionary): string | null {
  const payload = event.payload;

  switch (event.eventType) {
    case 'search': {
      const query = payloadText(payload?.query);
      if (query === null) {
        return null;
      }

      const results = payload?.results;
      return formatTemplate(t.screens.activity.summarySearch, {
        query,
        count: typeof results === 'number' ? results : 0,
      });
    }
    case 'screen_view': {
      const path = payloadText(payload?.path);
      return path === null ? null : formatTemplate(t.screens.activity.summaryPath, { path });
    }
    case 'show_open':
    case 'favorite_add':
    case 'favorite_remove': {
      const showId = payload?.showId;
      return typeof showId === 'number'
        ? formatTemplate(t.screens.activity.summaryShow, { id: showId })
        : null;
    }
    case 'filter_change':
    case 'preference_change':
    case 'theme_change': {
      const field = payloadText(payload?.field) ?? payloadText(payload?.preference);
      const value = payloadText(payload?.value);
      if (field === null || value === null) {
        return null;
      }

      return formatTemplate(t.screens.activity.summaryField, {
        field: fieldLabel(field, t),
        value,
      });
    }
    case 'gps_used': {
      const country = payloadText(payload?.country);
      return country === null
        ? null
        : formatTemplate(t.screens.activity.summaryCountry, { country });
    }
    case 'notification_permission':
    case 'notification_shown':
    case 'notification_open': {
      const status = payloadText(payload?.status) ?? payloadText(payload?.url);
      return status === null ? null : formatTemplate(t.screens.activity.summaryStatus, { status });
    }
    case 'sync_success': {
      const pushed = payload?.pushed;
      return typeof pushed === 'number'
        ? formatTemplate(t.screens.activity.summarySync, { count: pushed })
        : null;
    }
    default:
      return null;
  }
}

export function ActivityScreen() {
  const { t, language } = useI18n();
  const deps = useDependencies();
  const events = useUsageEvents();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCleared, setIsCleared] = useState(false);

  const hasEvents = (events?.length ?? 0) > 0;
  const groups = useMemo(() => groupByDay(events ?? [], language, t.common), [events, language, t]);
  const dateLabels = { today: t.common.today, yesterday: t.common.yesterday };

  const handleConfirmClear = () => {
    setIsDialogOpen(false);
    setIsCleared(false);

    void clearUsageEvents({
      usageEvents: deps.usageEvents,
      outbox: deps.outbox,
      hasRemote: deps.adapter !== null,
      now: nowIso,
      uuid: randomId,
    })
      .then(() => {
        setIsCleared(true);
      })
      .catch(() => {
        // El error queda visible como lista sin cambios; no rompemos la pantalla.
      });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.02em]">
          {t.screens.activity.title}
        </h1>

        {hasEvents && (
          <button
            type="button"
            onClick={() => {
              setIsDialogOpen(true);
            }}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-surface-2 px-4 text-xs font-bold uppercase tracking-[1.4px] text-fg transition-colors duration-150 hover:text-danger"
          >
            <TrashIcon className="h-4 w-4" />
            {t.screens.activity.clearAction}
          </button>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted">{t.screens.activity.privacyNote}</p>

      {isCleared && (
        <p role="status" aria-live="polite" className="text-xs text-success">
          {t.screens.activity.cleared}
        </p>
      )}

      {events === undefined ? (
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: ACTIVITY_SKELETON_COUNT }, (_, index) => (
            <div key={index} className="h-12 w-full animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      ) : !hasEvents ? (
        <EmptyState
          icon={<ActivityIcon className="h-7 w-7" />}
          title={t.screens.activity.emptyTitle}
          description={t.screens.activity.emptyDescription}
        />
      ) : (
        <ul aria-label={t.screens.activity.listLabel} className="space-y-5">
          {groups.map((group) => (
            <li key={group.key}>
              <section aria-label={group.label}>
                <h2 className="text-xs font-bold uppercase tracking-[1.4px] text-muted capitalize">
                  {group.label}
                </h2>
                <ul className="mt-1 divide-y divide-border">
                  {group.events.map((event) => {
                    const summary = summarize(event, t);

                    return (
                      <li key={event.id} className="flex min-h-11 items-center gap-3 py-2.5">
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
                        >
                          <EventIcon type={event.eventType} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {t.screens.activity.events[event.eventType]}
                          </span>
                          {summary !== null && (
                            <span className="block truncate text-xs text-muted">{summary}</span>
                          )}
                        </span>
                        <time dateTime={event.occurredAt} className="shrink-0 text-xs text-muted">
                          {formatRelativeDate(event.occurredAt, dateLabels, { language })}
                        </time>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={isDialogOpen}
        title={t.screens.activity.confirmTitle}
        description={t.screens.activity.confirmDescription}
        confirmLabel={t.screens.activity.confirmAction}
        cancelLabel={t.common.cancel}
        onConfirm={handleConfirmClear}
        onCancel={() => {
          setIsDialogOpen(false);
        }}
      />
    </div>
  );
}
