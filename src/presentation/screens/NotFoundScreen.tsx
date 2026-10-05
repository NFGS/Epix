import { Link } from 'react-router-dom';

import { EmptyState } from '@/presentation/components/EmptyState';
import { AlertIcon } from '@/presentation/components/icons';
import { useI18n } from '@/shared/i18n/i18n-context';

export function NotFoundScreen() {
  const { t } = useI18n();

  return (
    <div className="py-6">
      <EmptyState
        icon={<AlertIcon className="h-6 w-6" />}
        title={t.screens.notFound.title}
        description={t.screens.notFound.emptyDescription}
        action={
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {t.common.goHome}
          </Link>
        }
      />
    </div>
  );
}
