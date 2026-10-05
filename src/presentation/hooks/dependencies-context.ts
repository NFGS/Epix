import { createContext, useContext } from 'react';

import type { SyncAdapter } from '@/application/ports/sync-adapter';
import type { FavoritesRepository } from '@/domain/ports/favorites-repository';
import type { HistoryRepository } from '@/domain/ports/history-repository';
import type { NotificationsPort } from '@/domain/ports/notifications';
import type { NotifiedRepository } from '@/domain/ports/notified-repository';
import type { OutboxRepository } from '@/domain/ports/outbox-repository';
import type { SyncMetaRepository } from '@/domain/ports/sync-meta-repository';
import type { EpixDatabase } from '@/infrastructure/local/db';
import type { PreferencesRepositoryHandle } from '@/infrastructure/local/preferences.repository';
import type { SyncEngine } from '@/infrastructure/sync/sync-engine';

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
  adapter: SyncAdapter | null;
  engine: SyncEngine;
}

export const DependenciesContext = createContext<Dependencies | null>(null);

export function useDependencies(): Dependencies {
  const value = useContext(DependenciesContext);

  if (value === null) {
    throw new Error('useDependencies debe usarse dentro de <DependenciesContext.Provider>.');
  }

  return value;
}
