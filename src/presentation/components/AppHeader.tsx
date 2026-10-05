import { Link } from 'react-router-dom';

import { useI18n } from '@/shared/i18n/i18n-context';

import { UserIcon } from './icons';

export function AppHeader() {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
        <Link to="/" className="text-xl font-extrabold tracking-[-0.02em] text-fg">
          {t.appName}
        </Link>
        <Link
          to="/profile"
          aria-label={t.common.profileAria}
          className="flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-150 hover:bg-surface-2"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted">
            <UserIcon className="h-5 w-5" />
          </span>
        </Link>
      </div>
    </header>
  );
}
