import { useLiveQuery } from 'dexie-react-hooks';

import type { SyncMetaKey } from '@/domain/ports/sync-meta-repository';

import { useDependencies } from './dependencies-context';

/** Valor reactivo de una clave de `syncMeta` (p. ej. `lastSyncAt`). R-15. */
export function useSyncMeta(key: SyncMetaKey): string | null | undefined {
  const { syncMeta } = useDependencies();

  return useLiveQuery(() => syncMeta.get(key), [syncMeta, key], undefined);
}
