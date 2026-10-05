import { useParams } from 'react-router-dom';

import { EmptyState } from '@/presentation/components/EmptyState';
import { FilmIcon } from '@/presentation/components/icons';
import { useI18n } from '@/shared/i18n/i18n-context';

export function ShowDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t.screens.detail.title}</h1>

      <EmptyState
        icon={<FilmIcon className="h-6 w-6" />}
        title={t.screens.detail.emptyTitle}
        description={
          id !== undefined
            ? `#${id} · ${t.screens.detail.emptyDescription}`
            : t.screens.detail.emptyDescription
        }
      />
    </div>
  );
}
