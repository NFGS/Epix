import type { SyncMetaKey, SyncMetaRepository } from '@/domain/ports/sync-meta-repository';

import type { EpixDatabase } from './db';

export function createSyncMetaRepository(db: EpixDatabase): SyncMetaRepository {
  return {
    async get(key: SyncMetaKey): Promise<string | null> {
      const record = await db.syncMeta.get(key);
      return record?.value ?? null;
    },

    async set(key: SyncMetaKey, value: string): Promise<void> {
      await db.syncMeta.put({ key, value });
    },
  };
}
