import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/presentation/layout/AppLayout';
import { HomeScreen } from '@/presentation/screens/HomeScreen';

const SearchScreen = lazy(() =>
  import('@/presentation/screens/SearchScreen').then((module) => ({
    default: module.SearchScreen,
  })),
);

const ScheduleScreen = lazy(() =>
  import('@/presentation/screens/ScheduleScreen').then((module) => ({
    default: module.ScheduleScreen,
  })),
);

const FavoritesScreen = lazy(() =>
  import('@/presentation/screens/FavoritesScreen').then((module) => ({
    default: module.FavoritesScreen,
  })),
);

const HistoryScreen = lazy(() =>
  import('@/presentation/screens/HistoryScreen').then((module) => ({
    default: module.HistoryScreen,
  })),
);

const ProfileScreen = lazy(() =>
  import('@/presentation/screens/ProfileScreen').then((module) => ({
    default: module.ProfileScreen,
  })),
);

const ActivityScreen = lazy(() =>
  import('@/presentation/screens/ActivityScreen').then((module) => ({
    default: module.ActivityScreen,
  })),
);

const AccountScreen = lazy(() =>
  import('@/presentation/screens/AccountScreen').then((module) => ({
    default: module.AccountScreen,
  })),
);

const PrivacyScreen = lazy(() =>
  import('@/presentation/screens/PrivacyScreen').then((module) => ({
    default: module.PrivacyScreen,
  })),
);

const ShowDetailScreen = lazy(() =>
  import('@/presentation/screens/ShowDetailScreen').then((module) => ({
    default: module.ShowDetailScreen,
  })),
);

const NotFoundScreen = lazy(() =>
  import('@/presentation/screens/NotFoundScreen').then((module) => ({
    default: module.NotFoundScreen,
  })),
);

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/search" element={<SearchScreen />} />
        <Route path="/schedule" element={<ScheduleScreen />} />
        <Route path="/favorites" element={<FavoritesScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/activity" element={<ActivityScreen />} />
        <Route path="/account" element={<AccountScreen />} />
        <Route path="/privacy" element={<PrivacyScreen />} />
        <Route path="/shows/:id" element={<ShowDetailScreen />} />
        <Route path="*" element={<NotFoundScreen />} />
      </Route>
    </Routes>
  );
}
