import { useLiveQuery } from 'dexie-react-hooks';

import { TVMAZE_GENRES } from '@/domain/content-rating';
import { DEFAULT_PREFERENCES, type AgeRating } from '@/domain/entities/preferences';
import type { SyncEngineState } from '@/infrastructure/sync/sync-engine';
import { AgeRatingSelector } from '@/presentation/components/AgeRatingSelector';
import { GenreChips } from '@/presentation/components/GenreChips';
import { Spinner } from '@/presentation/components/Spinner';
import { LocationIcon, RefreshIcon } from '@/presentation/components/icons';
import { useDependencies } from '@/presentation/hooks/dependencies-context';
import { usePreferences, useUpdatePreferences } from '@/presentation/hooks/use-preferences';
import { useRequestLocation } from '@/presentation/hooks/use-request-location';
import { useScheduleCountry } from '@/presentation/hooks/use-schedule-country';
import { useSyncStatus } from '@/presentation/hooks/use-sync-status';
import type { Dictionary, Language } from '@/shared/i18n/dictionaries';
import { useI18n } from '@/shared/i18n/i18n-context';
import { formatDateTime, formatTemplate } from '@/shared/lib/format';
import { SCHEDULE_COUNTRIES } from '@/shared/lib/locale';

import type { ThemePreference } from '@/presentation/hooks/theme-context';
import { useTheme } from '@/presentation/hooks/theme-context';

interface UpcomingControlProps {
  label: string;
  hint: string;
  comingSoonLabel: string;
}

function UpcomingControl({ label, hint, comingSoonLabel }: UpcomingControlProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
          {comingSoonLabel}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={false}
          aria-label={label}
          disabled
          className="relative h-6 w-11 cursor-not-allowed rounded-full bg-surface-2 opacity-70 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-surface after:content-['']"
        />
      </div>
    </div>
  );
}

const themeOptions: ReadonlyArray<{
  value: ThemePreference;
  labelKey: 'themeLight' | 'themeDark' | 'themeSystem';
}> = [
  { value: 'light', labelKey: 'themeLight' },
  { value: 'dark', labelKey: 'themeDark' },
  { value: 'system', labelKey: 'themeSystem' },
];

const languageOptions: ReadonlyArray<{ value: Language; label: string }> = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

const syncStatusStyles: Record<SyncEngineState, string> = {
  'local-only': 'bg-surface-2 text-muted',
  offline: 'bg-warning/12 text-warning',
  syncing: 'bg-accent-soft text-accent-text',
  idle: 'bg-success/12 text-success',
  error: 'bg-danger/12 text-danger',
};

function syncStatusLabel(state: SyncEngineState, t: Dictionary): string {
  switch (state) {
    case 'local-only':
      return t.screens.profile.syncLocalOnly;
    case 'offline':
      return t.screens.profile.syncOffline;
    case 'syncing':
      return t.screens.profile.syncSyncing;
    case 'idle':
      return t.screens.profile.syncIdle;
    case 'error':
      return t.screens.profile.syncError;
  }
}

function SyncSection() {
  const { t, language } = useI18n();
  const { adapter, engine, syncMeta } = useDependencies();
  const status = useSyncStatus();
  const lastSyncAt = useLiveQuery(() => syncMeta.get('lastSyncAt'), [syncMeta], undefined);

  const isSyncDisabled =
    status.state === 'local-only' || status.state === 'offline' || status.state === 'syncing';

  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {t.screens.profile.dataSync}
      </h2>

      <div className="flex items-center justify-between gap-3">
        <span
          className={[
            'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[1.4px]',
            syncStatusStyles[status.state],
          ].join(' ')}
        >
          {syncStatusLabel(status.state, t)}
        </span>

        <button
          type="button"
          disabled={isSyncDisabled}
          onClick={() => {
            void engine.syncNow();
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-xs font-bold uppercase tracking-[1.4px] text-white transition-colors duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshIcon className="h-4 w-4" />
          {t.screens.profile.syncNow}
        </button>
      </div>

      <p className="text-sm text-muted">
        {lastSyncAt !== undefined && lastSyncAt !== null
          ? formatTemplate(t.screens.profile.lastSync, {
              date: formatDateTime(lastSyncAt, language),
            })
          : t.screens.profile.neverSynced}
      </p>

      {adapter === null && (
        <p className="text-xs leading-relaxed text-muted">{t.screens.profile.supabaseNote}</p>
      )}
    </section>
  );
}

function ContentPreferencesSection() {
  const { t } = useI18n();
  const preferences = usePreferences();
  const updatePreferences = useUpdatePreferences();

  const selectedGenres = preferences?.favoriteGenres ?? [];
  const maxAgeRating = preferences?.maxAgeRating ?? DEFAULT_PREFERENCES.maxAgeRating;

  const handleToggleGenre = (genre: string) => {
    const nextGenres = selectedGenres.includes(genre)
      ? selectedGenres.filter((selected) => selected !== genre)
      : [...selectedGenres, genre];

    void updatePreferences({ favoriteGenres: nextGenres });
  };

  const handleAgeChange = (rating: AgeRating) => {
    void updatePreferences({ maxAgeRating: rating });
  };

  const handleReset = () => {
    void updatePreferences({ ...DEFAULT_PREFERENCES });
  };

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {t.screens.profile.content}
      </h2>

      <GenreChips
        genres={TVMAZE_GENRES}
        selected={selectedGenres}
        onToggle={handleToggleGenre}
        legend={t.screens.profile.favoriteGenres}
      />

      <AgeRatingSelector
        value={maxAgeRating}
        onChange={handleAgeChange}
        legend={t.screens.profile.maxAge}
        descriptions={t.screens.profile.ageRatingHint}
      />

      <p className="text-xs leading-relaxed text-muted">{t.screens.profile.ageEstimationNote}</p>

      <button
        type="button"
        onClick={handleReset}
        className="min-h-11 rounded-full bg-surface-2 px-4 text-xs font-bold uppercase tracking-[1.4px] text-muted transition-colors duration-150 hover:text-fg"
      >
        {t.screens.profile.resetPreferences}
      </button>
    </section>
  );
}

function countryName(code: string): string {
  return SCHEDULE_COUNTRIES.find((option) => option.code === code)?.name ?? code;
}

function LocationSection() {
  const { t } = useI18n();
  const { country, countrySource } = useScheduleCountry();
  const location = useRequestLocation();
  const isRequesting = location.status === 'requesting';

  const sourceLabel =
    countrySource === 'gps'
      ? t.location.sourceGps
      : countrySource === 'manual'
        ? t.location.sourceManual
        : t.location.sourceAuto;
  const successCountry = location.detectedCountry ?? country;

  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {t.location.section}
      </h2>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{t.location.currentCountry}</p>
          <p className="text-xs text-muted">
            {countryName(country)} · {sourceLabel}
          </p>
        </div>

        <button
          type="button"
          onClick={location.requestLocation}
          disabled={isRequesting}
          aria-busy={isRequesting}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-xs font-bold uppercase tracking-[1.4px] text-white transition-colors duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRequesting ? <Spinner /> : <LocationIcon className="h-4 w-4" />}
          {isRequesting ? t.location.detecting : t.location.detectButton}
        </button>
      </div>

      {location.status === 'success' && (
        <p role="status" aria-live="polite" className="text-xs text-success">
          {formatTemplate(t.location.detected, { country: countryName(successCountry) })}
        </p>
      )}
      {location.status === 'error' && location.message !== null && (
        <p role="status" aria-live="polite" className="text-xs text-danger">
          {location.message}
        </p>
      )}
    </section>
  );
}

export function ProfileScreen() {
  const { t, language, setLanguage } = useI18n();
  const { preference, setPreference } = useTheme();

  return (
    <div className="space-y-6">
      <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.02em]">
        {t.screens.profile.title}
      </h1>

      <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {t.screens.profile.appearance}
        </h2>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t.screens.profile.theme}</p>
          <div role="group" aria-label={t.screens.profile.theme} className="grid grid-cols-3 gap-2">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={preference === option.value}
                onClick={() => {
                  setPreference(option.value);
                }}
                className={[
                  'min-h-11 rounded-full border px-2 text-sm font-medium transition-colors duration-150',
                  preference === option.value
                    ? 'border-accent bg-accent text-white'
                    : 'border-border bg-surface-2 text-muted hover:text-fg',
                ].join(' ')}
              >
                {t.screens.profile[option.labelKey]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t.screens.profile.language}</p>
          <div
            role="group"
            aria-label={t.screens.profile.language}
            className="grid grid-cols-2 gap-2"
          >
            {languageOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={language === option.value}
                onClick={() => {
                  setLanguage(option.value);
                }}
                className={[
                  'min-h-11 rounded-full border px-2 text-sm font-medium transition-colors duration-150',
                  language === option.value
                    ? 'border-accent bg-accent text-white'
                    : 'border-border bg-surface-2 text-muted hover:text-fg',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <ContentPreferencesSection />

      <LocationSection />

      <section className="divide-y divide-border rounded-xl border border-border bg-surface px-4">
        <UpcomingControl
          label={t.screens.profile.notifications}
          hint={t.screens.profile.notificationsHint}
          comingSoonLabel={t.common.comingSoon}
        />
        <UpcomingControl
          label={t.screens.profile.telemetry}
          hint={t.screens.profile.telemetryHint}
          comingSoonLabel={t.common.comingSoon}
        />
      </section>

      <SyncSection />
    </div>
  );
}
