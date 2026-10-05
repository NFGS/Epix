import { EmptyState } from '@/presentation/components/EmptyState';
import { ErrorState } from '@/presentation/components/ErrorState';
import { ScheduleItem } from '@/presentation/components/ScheduleItem';
import { CalendarIcon, ChevronDownIcon, GlobeIcon } from '@/presentation/components/icons';
import { useSchedule } from '@/presentation/hooks/queries/use-schedule';
import { useSlowLoading } from '@/presentation/hooks/queries/use-slow-loading';
import { useScheduleCountry } from '@/presentation/hooks/use-schedule-country';
import { todayIso } from '@/shared/lib/date';
import { formatTemplate } from '@/shared/lib/format';
import { isScheduleCountryCode, SCHEDULE_COUNTRIES } from '@/shared/lib/locale';
import { groupByHour } from '@/shared/lib/schedule';
import { useI18n } from '@/shared/i18n/i18n-context';

const ITEM_SKELETON_COUNT = 5;

export function ScheduleScreen() {
  const { t, language } = useI18n();
  const { country, setCountry } = useScheduleCountry();
  const date = todayIso();

  const { data, isPending, isFetching, isError, refetch } = useSchedule(country, date);
  const isLoading = isPending && isFetching;
  const isSlow = useSlowLoading(isLoading);

  const groups = groupByHour(data ?? []);
  const dateLabel = new Intl.DateTimeFormat(language === 'es' ? 'es-CO' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <div className="space-y-4">
      <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.02em]">
        {t.screens.schedule.title}
      </h1>

      <div className="relative">
        <GlobeIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <select
          value={country}
          aria-label={t.screens.schedule.countryLabel}
          onChange={(event) => {
            if (isScheduleCountryCode(event.target.value)) {
              setCountry(event.target.value);
            }
          }}
          className="h-12 w-full appearance-none rounded-full border border-transparent bg-surface-2 pl-11 pr-11 text-sm font-medium text-fg transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft"
        >
          {SCHEDULE_COUNTRIES.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
      </div>

      <p className="text-sm capitalize text-muted">
        {formatTemplate(t.screens.schedule.dayLabel, { date: dateLabel })}
      </p>

      {isLoading ? (
        <>
          <div className="space-y-2" aria-hidden="true">
            {Array.from({ length: ITEM_SKELETON_COUNT }, (_, index) => (
              <div key={index} className="h-[82px] w-full animate-pulse rounded-xl bg-surface-2" />
            ))}
          </div>
          <p role="status" className="sr-only">
            {t.common.loading}
          </p>
          {isSlow && <p className="text-center text-xs text-muted">{t.common.slowLoading}</p>}
        </>
      ) : isError ? (
        <ErrorState
          message={t.screens.schedule.errorDescription}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon className="h-7 w-7" />}
          title={t.screens.schedule.emptyTitle}
          description={t.screens.schedule.emptyDescription}
        />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.hour ?? 'unknown'}>
              <h2 className="text-xs font-bold uppercase tracking-[1.4px] text-muted">
                {group.hour ?? t.screens.schedule.noTime}
              </h2>
              <ul className="mt-1 divide-y divide-border">
                {group.entries.map((entry) => (
                  <li key={entry.episodeId}>
                    <ScheduleItem entry={entry} showTime={false} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
