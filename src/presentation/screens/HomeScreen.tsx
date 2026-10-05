import { ShowCard } from '@/presentation/components/ShowCard';
import { demoShows } from '@/presentation/data/demo-shows';
import { useI18n } from '@/shared/i18n/i18n-context';

export function HomeScreen() {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">{t.screens.home.greeting}</h1>
        <p className="text-sm text-muted">{t.screens.home.subtitle}</p>
      </header>

      <p className="rounded-lg border border-accent-300/60 bg-accent-50 px-3 py-2 text-xs text-accent-900 dark:border-accent-900 dark:bg-accent-950/60 dark:text-accent-200">
        {t.screens.home.demoNotice}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {demoShows.map((show) => (
          <ShowCard key={show.id} show={show} showDemoBadge />
        ))}
      </div>
    </div>
  );
}
