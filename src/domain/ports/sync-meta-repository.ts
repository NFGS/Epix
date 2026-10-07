export type SyncMetaKey = 'lastPulledAt' | 'userId' | 'lastSyncAt';

export interface SyncMetaRepository {
  get(key: SyncMetaKey): Promise<string | null>;
  set(key: SyncMetaKey, value: string): Promise<void>;
  /** Elimina todos los cursores (uso: cierre de sesión; el próximo login hace pull completo). */
  clear(): Promise<void>;
}
