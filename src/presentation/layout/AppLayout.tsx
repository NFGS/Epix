import { Outlet } from 'react-router-dom';

import { AppHeader } from '@/presentation/components/AppHeader';
import { BottomNav } from '@/presentation/components/BottomNav';
import { OfflineBanner } from '@/presentation/components/OfflineBanner';
import { useI18n } from '@/shared/i18n/i18n-context';

export function AppLayout() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-svh flex-col bg-bg text-fg">
      <AppHeader />
      <OfflineBanner />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-4">
        <Outlet />
        <footer className="mt-10 text-center text-[11px] text-muted">
          {t.common.tvmazeAttribution} ·{' '}
          <a
            href="https://www.tvmaze.com"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            tvmaze.com
          </a>
        </footer>
      </main>
      <BottomNav />
    </div>
  );
}
