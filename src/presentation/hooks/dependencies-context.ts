import { createContext, useContext } from 'react';

import type { CloudAuth } from '@/application/ports/auth';
import type { ResolveCountryFn } from '@/application/ports/location';
import type { SyncAdapter } from '@/application/ports/sync-adapter';
import type { SyncEngine } from '@/application/ports/sync-engine';
import type { FavoritesRepository } from '@/domain/ports/favorites-repository';
import type { HistoryRepository } from '@/domain/ports/history-repository';
import type { NotificationsPort } from '@/domain/ports/notifications';
import type { NotifiedRepository } from '@/domain/ports/notified-repository';
import type { OutboxRepository } from '@/domain/ports/outbox-repository';
import type { SyncMetaRepository } from '@/domain/ports/sync-meta-repository';
import type { TelemetryPort } from '@/domain/ports/telemetry';
import type { UsageEventsRepository } from '@/domain/ports/usage-events-repository';
// composición (solo wiring): la base Dexie se expone para pruebas y borrado.
import type { EpixDatabase } from '@/infrastructure/local/db';
import type { PreferencesRepositoryHandle } from '@/infrastructure/local/preferences.repository';

/** Composición de dependencias inyectadas por la app (offline-first + sync). */
export interface Dependencies {
  db: EpixDatabase;
  favorites: FavoritesRepository;
  history: HistoryRepository;
  outbox: OutboxRepository;
  preferences: PreferencesRepositoryHandle;
  syncMeta: SyncMetaRepository;
  notified: NotifiedRepository;
  notifications: NotificationsPort;
  usageEvents: UsageEventsRepository;
  telemetry: TelemetryPort;
  adapter: SyncAdapter | null;
  engine: SyncEngine;
  /** Auth en la nube (OTP por correo); `null` cuando no hay Supabase configurado. */
  auth: CloudAuth | null;
  /** Resolución de país por GPS (composición en `providers.tsx`, R-03). */
  resolveCountry: ResolveCountryFn;
}

export const DependenciesContext = createContext<Dependencies | null>(null);

export function useDependencies(): Dependencies {
  const value = useContext(DependenciesContext);

  if (value === null) {
    throw new Error('useDependencies debe usarse dentro de <DependenciesContext.Provider>.');
  }

  return value;
}
