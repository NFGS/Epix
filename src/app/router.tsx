import { Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/presentation/layout/AppLayout';
import { ActivityScreen } from '@/presentation/screens/ActivityScreen';
import { FavoritesScreen } from '@/presentation/screens/FavoritesScreen';
import { HistoryScreen } from '@/presentation/screens/HistoryScreen';
import { HomeScreen } from '@/presentation/screens/HomeScreen';
import { NotFoundScreen } from '@/presentation/screens/NotFoundScreen';
import { ProfileScreen } from '@/presentation/screens/ProfileScreen';
import { ScheduleScreen } from '@/presentation/screens/ScheduleScreen';
import { SearchScreen } from '@/presentation/screens/SearchScreen';
import { ShowDetailScreen } from '@/presentation/screens/ShowDetailScreen';

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
        <Route path="/shows/:id" element={<ShowDetailScreen />} />
        <Route path="*" element={<NotFoundScreen />} />
      </Route>
    </Routes>
  );
}
