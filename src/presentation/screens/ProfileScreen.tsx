import type { Language } from '@/shared/i18n/dictionaries';
import { useI18n } from '@/shared/i18n/i18n-context';

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

const demoGenres = ['Drama', 'Ciencia ficción', 'Comedia', 'Terror'] as const;
const demoAgeRatings = ['TV-Y', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA'] as const;

export function ProfileScreen() {
  const { t, language, setLanguage } = useI18n();
  const { preference, setPreference } = useTheme();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t.screens.profile.title}</h1>

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
                  'min-h-11 rounded-lg border px-2 text-sm font-medium transition-colors',
                  preference === option.value
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-border bg-surface-2 text-muted hover:text-text',
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
                  'min-h-11 rounded-lg border px-2 text-sm font-medium transition-colors',
                  language === option.value
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-border bg-surface-2 text-muted hover:text-text',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {t.screens.profile.content}
          </h2>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            {t.common.comingSoon}
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t.screens.profile.favoriteGenres}</p>
          <ul className="flex flex-wrap gap-2">
            {demoGenres.map((genre) => (
              <li
                key={genre}
                className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted"
              >
                {genre}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t.screens.profile.maxAge}</p>
          <ul className="flex flex-wrap gap-2">
            {demoAgeRatings.map((rating) => (
              <li
                key={rating}
                className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted"
              >
                {rating}
              </li>
            ))}
          </ul>
        </div>
      </section>

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
    </div>
  );
}
