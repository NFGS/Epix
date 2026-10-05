import { Link } from 'react-router-dom';

import { useI18n } from '@/shared/i18n/i18n-context';

import { UserIcon } from './icons';

export function AppHeader() {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
        <Link
          to="/"
          className="text-lg font-extrabold tracking-tight text-brand-600 dark:text-brand-400"
        >
          {t.appName}
        </Link>
        <Link
          to="/profile"
          aria-label={t.common.profileAria}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-2 text-muted transition-colors hover:text-text"
        >
          <UserIcon className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
