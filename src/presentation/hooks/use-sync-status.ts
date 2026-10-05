import { useSyncExternalStore } from 'react';

import type { SyncEngineStatus } from '@/infrastructure/sync/sync-engine';

import { useDependencies } from './dependencies-context';

/** Estado del motor de sincronización (observable simple sobre useSyncExternalStore). */
export function useSyncStatus(): SyncEngineStatus {
  const { engine } = useDependencies();
  return useSyncExternalStore(engine.subscribe, engine.getStatus, engine.getStatus);
}
