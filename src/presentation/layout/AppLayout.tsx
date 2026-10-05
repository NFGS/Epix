import { Outlet } from 'react-router-dom';

import { AppHeader } from '@/presentation/components/AppHeader';
import { BottomNav } from '@/presentation/components/BottomNav';

export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-bg text-text">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
