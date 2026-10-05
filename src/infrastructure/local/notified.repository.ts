import type { NotifiedEpisode, NotifiedRepository } from '@/domain/ports/notified-repository';

import type { EpixDatabase } from './db';

export function createNotifiedRepository(db: EpixDatabase): NotifiedRepository {
  return {
    async isNotified(key: string): Promise<boolean> {
      return (await db.notified.get(key)) !== undefined;
    },

    async markNotified(record: NotifiedEpisode): Promise<void> {
      await db.notified.put(record);
    },
  };
}
