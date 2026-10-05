import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { TVMAZE_GENRES } from '@/domain/content-rating';
import { DEFAULT_PREFERENCES, type AgeRating } from '@/domain/entities/preferences';
import type { NotificationPermissionState } from '@/domain/ports/notifications';
import type { SyncEngineState } from '@/infrastructure/sync/sync-engine';
import { AgeRatingSelector } from '@/presentation/components/AgeRatingSelector';
import { GenreChips } from '@/presentation/components/GenreChips';
import { Spinner } from '@/presentation/components/Spinner';
import { ActivityIcon, BellIcon, LocationIcon, RefreshIcon } from '@/presentation/components/icons';
import { useDependencies } from '@/presentation/hooks/dependencies-context';
import {
  useEpisodeReminders,
  type EpisodeRemindersOutcome,
} from '@/presentation/hooks/use-episode-reminders';
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

interface TelemetrySectionProps {
  label: string;
  consent: string;
  enabledNote: string;
  disabledNote: string;
  activityLabel: string;
}

function TelemetrySection({
  label,
  consent,
  enabledNote,
  disabledNote,
  activityLabel,
}: TelemetrySectionProps) {
  const preferences = usePreferences();
  const updatePreferences = useUpdatePreferences();
  const enabled = preferences?.telemetryEnabled ?? false;

  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{label}</h2>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={label}
          onClick={() => {
            void updatePreferences({ telemetryEnabled: !enabled });
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span
            className={[
              'relative h-6 w-11 rounded-full transition-colors duration-150',
              enabled ? 'bg-accent' : 'bg-surface-2',
            ].join(' ')}
          >
            <span
              className={[
                'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150',
                enabled ? 'translate-x-5' : '',
              ].join(' ')}
            />
          </span>
        </button>
      </div>

      <p className="text-xs leading-relaxed text-muted">{consent}</p>

      <p className="text-xs leading-relaxed text-muted">{enabled ? enabledNote : disabledNote}</p>

      <Link
        to="/activity"
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-4 text-xs font-bold uppercase tracking-[1.4px] text-fg transition-colors duration-150 hover:text-accent-text"
      >
        <ActivityIcon className="h-4 w-4" />
        {activityLabel}
      </Link>
    </section>
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
  const { telemetry } = useDependencies();
  const preferences = usePreferences();
  const updatePreferences = useUpdatePreferences();

  const selectedGenres = preferences?.favoriteGenres ?? [];
  const maxAgeRating = preferences?.maxAgeRating ?? DEFAULT_PREFERENCES.maxAgeRating;

  const handleToggleGenre = (genre: string) => {
    const nextGenres = selectedGenres.includes(genre)
      ? selectedGenres.filter((selected) => selected !== genre)
      : [...selectedGenres, genre];

    void updatePreferences({ favoriteGenres: nextGenres });
    void telemetry.track('filter_change', { field: 'genres', value: nextGenres });
  };

  const handleAgeChange = (rating: AgeRating) => {
    void updatePreferences({ maxAgeRating: rating });
    void telemetry.track('filter_change', { field: 'maxAgeRating', value: rating });
  };

  const handleReset = () => {
    void updatePreferences({ ...DEFAULT_PREFERENCES });
    void telemetry.track('filter_change', { field: 'reset' });
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

function reminderOutcomeLabel(outcome: EpisodeRemindersOutcome, t: Dictionary): string {
  switch (outcome.status) {
    case 'sent':
      return formatTemplate(t.screens.profile.notificationsCheckSent, { count: outcome.count });
    case 'empty':
      return t.screens.profile.notificationsCheckEmpty;
    case 'disabled':
      return t.screens.profile.notificationsCheckDisabled;
    case 'denied':
      return t.screens.profile.notificationsCheckDenied;
    case 'unsupported':
      return t.screens.profile.notificationsCheckUnsupported;
    case 'error':
      return t.screens.profile.notificationsCheckError;
  }
}

function NotificationsSection() {
  const { t } = useI18n();
  const { notifications, telemetry } = useDependencies();
  const preferences = usePreferences();
  const updatePreferences = useUpdatePreferences();
  const { status, result, checkNow } = useEpisodeReminders();
  const [permission, setPermission] = useState<NotificationPermissionState>(() =>
    notifications.getPermissionState(),
  );
  const [pendingPermission, setPendingPermission] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  const enabled = preferences?.notificationsEnabled ?? false;
  const canNotify = permission === 'granted' && enabled;
  const isChecking = status === 'running';

  const handleToggle = async () => {
    setTestStatus('idle');

    if (enabled) {
      await updatePreferences({ notificationsEnabled: false });
      return;
    }

    const next = await notifications.requestPermission();
    setPermission(next);
    void telemetry.track('notification_permission', { status: next });

    if (next === 'granted') {
      setPendingPermission(false);
      await updatePreferences({ notificationsEnabled: true });
      return;
    }

    setPendingPermission(true);
  };

  const handleTest = async () => {
    try {
      await notifications.showLocalNotification({
        title: t.notificationsContent.testTitle,
        body: t.notificationsContent.testBody,
        url: '/favorites',
        tag: 'epix-test',
      });
      setTestStatus('sent');
    } catch {
      setTestStatus('error');
    }
  };

  const message =
    permission === 'unsupported'
      ? t.screens.profile.notificationsUnsupported
      : permission === 'denied'
        ? t.screens.profile.notificationsDenied
        : pendingPermission
          ? t.screens.profile.notificationsDismissed
          : enabled
            ? t.screens.profile.notificationsEnabledNote
            : null;

  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {t.screens.profile.notifications}
          </h2>
          <p className="text-xs text-muted">{t.screens.profile.notificationsHint}</p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={t.screens.profile.notifications}
          onClick={() => void handleToggle()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span
            className={[
              'relative h-6 w-11 rounded-full transition-colors duration-150',
              enabled ? 'bg-accent' : 'bg-surface-2',
            ].join(' ')}
          >
            <span
              className={[
                'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150',
                enabled ? 'translate-x-5' : '',
              ].join(' ')}
            />
          </span>
        </button>
      </div>

      {message !== null && (
        <p
          role="status"
          aria-live="polite"
          className={[
            'text-xs leading-relaxed',
            permission === 'denied' || permission === 'unsupported' ? 'text-danger' : 'text-muted',
          ].join(' ')}
        >
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canNotify}
          onClick={() => void handleTest()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-4 text-xs font-bold uppercase tracking-[1.4px] text-fg transition-colors duration-150 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
        >
          <BellIcon className="h-4 w-4" />
          {t.screens.profile.notificationsTest}
        </button>

        <button
          type="button"
          disabled={!canNotify || isChecking}
          aria-busy={isChecking}
          onClick={() => void checkNow()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-4 text-xs font-bold uppercase tracking-[1.4px] text-fg transition-colors duration-150 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isChecking ? <Spinner /> : <RefreshIcon className="h-4 w-4" />}
          {isChecking
            ? t.screens.profile.notificationsChecking
            : t.screens.profile.notificationsCheck}
        </button>
      </div>

      {testStatus !== 'idle' && (
        <p
          role="status"
          aria-live="polite"
          className={['text-xs', testStatus === 'sent' ? 'text-success' : 'text-danger'].join(' ')}
        >
          {testStatus === 'sent'
            ? t.screens.profile.notificationsTestSent
            : t.screens.profile.notificationsTestError}
        </p>
      )}

      {result !== null && (
        <p role="status" aria-live="polite" className="text-xs text-muted">
          {reminderOutcomeLabel(result, t)}
        </p>
      )}
    </section>
  );
}

export function ProfileScreen() {
  const { t, language, setLanguage } = useI18n();
  const { preference, setPreference } = useTheme();
  const { telemetry } = useDependencies();

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
                  void telemetry.track('preference_change', {
                    preference: 'theme',
                    value: option.value,
                  });
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
                  void telemetry.track('preference_change', {
                    preference: 'language',
                    value: option.value,
                  });
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

      <NotificationsSection />

      <TelemetrySection
        label={t.screens.profile.telemetry}
        consent={t.screens.profile.telemetryConsent}
        enabledNote={t.screens.profile.telemetryEnabledNote}
        disabledNote={t.screens.profile.telemetryDisabledNote}
        activityLabel={t.screens.profile.telemetryActivity}
      />

      <SyncSection />
    </div>
  );
}
