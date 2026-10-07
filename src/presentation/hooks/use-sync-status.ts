import { useSyncExternalStore } from 'react';

import type { SyncEngineStatus } from '@/application/ports/sync-engine';

import { useDependencies } from './dependencies-context';

/**
 * Estado del motor de sincronización (observable simple sobre `useSyncExternalStore`).
 * El motor compuesto (`cross-tab-sync`) ya incorpora el estado difundido por
 * BroadcastChannel, así que aquí se ve el «Sincronizando…» de otras pestañas.
 */
export function useSyncStatus(): SyncEngineStatus {
  const { engine } = useDependencies();
  return useSyncExternalStore(engine.subscribe, engine.getStatus, engine.getStatus);
}
