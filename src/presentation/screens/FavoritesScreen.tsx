import { EmptyState } from '@/presentation/components/EmptyState';
import { HeartIcon } from '@/presentation/components/icons';
import { useI18n } from '@/shared/i18n/i18n-context';

export function FavoritesScreen() {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t.screens.favorites.title}</h1>

      <EmptyState
        icon={<HeartIcon className="h-6 w-6" />}
        title={t.screens.favorites.emptyTitle}
        description={t.screens.favorites.emptyDescription}
      />
    </div>
  );
}
