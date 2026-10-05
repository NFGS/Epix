/**
 * Puerto del motor de sincronización.
 *
 * La infraestructura lo implementa (`infrastructure/sync/sync-engine.ts`) y la
 * presentación consume este contrato sin conocer los detalles de red.
 */
export type SyncEngineState = 'local-only' | 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncEngineStatus {
  state: SyncEngineState;
  lastSyncedAt?: string;
  lastError?: string;
}

/** Transiciones del motor reportadas a telemetría (RF-11). */
export type SyncEngineEvent = 'sync_success' | 'sync_error';

export interface SyncEngine {
  getStatus(): SyncEngineStatus;
  subscribe(listener: () => void): () => void;
  syncNow(): Promise<void>;
}
