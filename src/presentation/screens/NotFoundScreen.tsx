import { Link } from 'react-router-dom';

import { EmptyState } from '@/presentation/components/EmptyState';
import { AlertIcon } from '@/presentation/components/icons';
import { useI18n } from '@/shared/i18n/i18n-context';

export function NotFoundScreen() {
  const { t } = useI18n();

  return (
    <div className="py-6">
      <EmptyState
        icon={<AlertIcon className="h-7 w-7" />}
        title={t.screens.notFound.title}
        description={t.screens.notFound.emptyDescription}
        action={
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-xs font-bold uppercase tracking-[1.4px] text-white transition-colors duration-150 hover:bg-accent-hover"
          >
            {t.common.goHome}
          </Link>
        }
      />
    </div>
  );
}
