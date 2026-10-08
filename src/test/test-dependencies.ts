import type { ResolveCountryFn } from '@/application/ports/location';
import { createEpixDatabase } from '@/infrastructure/local/db';
import { createFavoritesRepository } from '@/infrastructure/local/favorites.repository';
import { createHistoryRepository } from '@/infrastructure/local/history.repository';
import { createNotifiedRepository } from '@/infrastructure/local/notified.repository';
import { createOutboxRepository } from '@/infrastructure/local/outbox.repository';
import { createPreferencesRepository } from '@/infrastructure/local/preferences.repository';
import { createSyncMetaRepository } from '@/infrastructure/local/sync-meta.repository';
import { createUsageEventsRepository } from '@/infrastructure/local/usage-events.repository';
import { createNotificationClient } from '@/infrastructure/notifications/notifications';
import { createSyncEngine } from '@/infrastructure/sync/sync-engine';
import { createTelemetryService } from '@/infrastructure/telemetry/telemetry-service';
import type { Dependencies } from '@/presentation/hooks/dependencies-context';
import { createFakePushGateway } from '@/test/fake-push-gateway';

let databaseCounter = 0;

export type TestDependencies = Dependencies;

/** Dependencias reales (Dexie sobre fake-indexeddb) con adapter local-only. */
export function createTestDependencies(overrides: Partial<Dependencies> = {}): TestDependencies {
  databaseCounter += 1;
  const db = createEpixDatabase(`epix-test-${databaseCounter}-${crypto.randomUUID()}`);
  const favorites = createFavoritesRepository(db);
  const history = createHistoryRepository(db);
  const outbox = createOutboxRepository(db);
  const preferences = createPreferencesRepository(db);
  const syncMeta = createSyncMetaRepository(db);
  const notified = createNotifiedRepository(db);
  const usageEvents = createUsageEventsRepository(db);
  const notifications = createNotificationClient({ api: null, getRegistration: null });
  const telemetry = createTelemetryService({
    eventsRepo: usageEvents,
    outbox,
    getPreferences: () => preferences.get(),
    now: () => new Date().toISOString(),
    timezone: () => 'America/Bogota',
    appVersion: 'test',
  });
  const adapter = null;
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
  const resolveCountry: ResolveCountryFn = async () => ({ country: 'CO', source: 'gps' });
  const push = createFakePushGateway();

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
    auth: null,
    push,
    resolveCountry,
    ...overrides,
  };
}
