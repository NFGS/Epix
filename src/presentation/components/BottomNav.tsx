import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';

import { useI18n } from '@/shared/i18n/i18n-context';

import { CalendarIcon, ClockIcon, HeartIcon, HomeIcon, SearchIcon } from './icons';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
}

export function BottomNav() {
  const { t } = useI18n();

  const items: NavItem[] = [
    { to: '/', label: t.nav.home, icon: HomeIcon, end: true },
    { to: '/search', label: t.nav.search, icon: SearchIcon },
    { to: '/schedule', label: t.nav.schedule, icon: CalendarIcon },
    { to: '/favorites', label: t.nav.favorites, icon: HeartIcon },
    { to: '/history', label: t.nav.history, icon: ClockIcon },
  ];

  return (
    <nav
      aria-label={t.common.mainNavigation}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/85 backdrop-blur-md safe-bottom"
    >
      <ul className="mx-auto flex h-[60px] w-full max-w-3xl items-stretch">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[11px] font-medium transition-colors duration-150',
                  isActive ? 'text-fg' : 'text-muted hover:text-fg',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={isActive ? 'h-6 w-6 text-accent-text' : 'h-6 w-6'} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
