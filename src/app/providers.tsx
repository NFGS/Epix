import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { resolveCountry as resolveCountryUseCase } from '@/application/use-cases/resolve-country';
import { createGeolocationClient } from '@/infrastructure/geo/geolocation';
import { createReverseGeocoder } from '@/infrastructure/geo/reverse-geocode';
import { createFavoritesRepository } from '@/infrastructure/local/favorites.repository';
import { createEpixDatabase } from '@/infrastructure/local/db';
import { createHistoryRepository } from '@/infrastructure/local/history.repository';
import { createNotifiedRepository } from '@/infrastructure/local/notified.repository';
import { createOutboxRepository } from '@/infrastructure/local/outbox.repository';
import { createPreferencesRepository } from '@/infrastructure/local/preferences.repository';
import { createSyncMetaRepository } from '@/infrastructure/local/sync-meta.repository';
import { createUsageEventsRepository } from '@/infrastructure/local/usage-events.repository';
import { createNotificationClient } from '@/infrastructure/notifications/notifications';
import {
  createLazySupabaseSyncAdapter,
  hasSupabaseConfig,
} from '@/infrastructure/supabase/create-sync-adapter';
import { createSyncEngine } from '@/infrastructure/sync/sync-engine';
import { createTelemetryService } from '@/infrastructure/telemetry/telemetry-service';
import { DependenciesContext, type Dependencies } from '@/presentation/hooks/dependencies-context';
import { createTvmazeScheduleRepository } from '@/infrastructure/tvmaze/tvmaze-schedule.repository';
import { createTvmazeShowRepository } from '@/infrastructure/tvmaze/tvmaze-show.repository';
import { RepositoriesContext, type Repositories } from '@/presentation/hooks/repositories-context';
import { I18nProvider } from '@/shared/i18n/I18nProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider } from '@/presentation/hooks/ThemeProvider';

import { EpisodeReminderBootstrap } from './EpisodeReminderBootstrap';
import { RouteTelemetry } from './RouteTelemetry';
import { ServiceWorkerBridge } from './ServiceWorkerBridge';
import { TelemetryBootstrap } from './TelemetryBootstrap';

function createDependencies(): Dependencies {
  const db = createEpixDatabase();
  const favorites = createFavoritesRepository(db);
  const history = createHistoryRepository(db);
  const outbox = createOutboxRepository(db);
  const preferences = createPreferencesRepository(db);
  const syncMeta = createSyncMetaRepository(db);
  const notified = createNotifiedRepository(db);
  const usageEvents = createUsageEventsRepository(db);
  const notifications = createNotificationClient();
  const telemetry = createTelemetryService({
    eventsRepo: usageEvents,
    outbox,
    getPreferences: () => preferences.get(),
  });
  const adapter = hasSupabaseConfig() ? createLazySupabaseSyncAdapter() : null;
  const engine = createSyncEngine({
    outbox,
    repoFavorites: favorites,
    repoHistory: history,
    meta: syncMeta,
    adapter,
    onSyncEvent: (event, payload) => {
      void telemetry.track(event, payload);
    },
  });

  const resolveCountry = () =>
    resolveCountryUseCase({
      getPosition: createGeolocationClient().getPosition,
      reverseGeocode: createReverseGeocoder(),
    });

  return {
    db,
    favorites,
    history,
    outbox,
    preferences,
    syncMeta,
    notified,
    notifications,
    usageEvents,
    telemetry,
    adapter,
    engine,
    resolveCountry,
  };
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  const [repositories] = useState<Repositories>(() => ({
    shows: createTvmazeShowRepository(),
    schedule: createTvmazeScheduleRepository(),
  }));

  const [dependencies] = useState<Dependencies>(createDependencies);
  const repositoriesValue = useMemo(() => repositories, [repositories]);

  const handleNotificationOpen = useCallback(
    (url: string) => {
      void dependencies.telemetry.track('notification_open', { url });
    },
    [dependencies],
  );

  useEffect(() => {
    void dependencies.preferences.ensureSeeded();
    void dependencies.engine.syncNow();

    const handleOnline = () => {
      void dependencies.engine.syncNow();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [dependencies]);

  return (
    <QueryClientProvider client={queryClient}>
      <RepositoriesContext.Provider value={repositoriesValue}>
        <DependenciesContext.Provider value={dependencies}>
          <ThemeProvider>
            <I18nProvider>
              <BrowserRouter>
                <ServiceWorkerBridge onNotificationOpen={handleNotificationOpen} />
                <TelemetryBootstrap telemetry={dependencies.telemetry} />
                <RouteTelemetry telemetry={dependencies.telemetry} />
                <EpisodeReminderBootstrap />
                {children}
              </BrowserRouter>
            </I18nProvider>
          </ThemeProvider>
        </DependenciesContext.Provider>
      </RepositoriesContext.Provider>
    </QueryClientProvider>
  );
}
