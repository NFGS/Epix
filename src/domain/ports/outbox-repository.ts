import type { FavoriteShow } from '@/domain/entities/favorite';
import type { HistoryEntry } from '@/domain/entities/history-entry';
import type { UsageEvent } from '@/domain/entities/usage-event';

export type OutboxStatus = 'pending' | 'sent' | 'failed';

/** Entidades cuyas operaciones se encolan para sincronizar. */
export type OutboxEntity = 'favorite' | 'history' | 'telemetry';

interface OutboxBase {
  id?: number;
  opId: string;
  createdAt: string;
  attempts: number;
  lastAttemptAt?: string;
  status: OutboxStatus;
}

export interface FavoriteUpsertOperation extends OutboxBase {
  entity: 'favorite';
  operation: 'upsert';
  entityId: number;
  payload: FavoriteShow;
}

export interface FavoriteDeleteOperation extends OutboxBase {
  entity: 'favorite';
  operation: 'delete';
  entityId: number;
  payload: null;
}

export interface HistoryPushOperation extends OutboxBase {
  entity: 'history';
  operation: 'push';
  entityId: string;
  payload: HistoryEntry;
}

export interface HistoryClearOperation extends OutboxBase {
  entity: 'history';
  operation: 'clear';
  entityId: null;
  payload: null;
}

export interface TelemetryPushOperation extends OutboxBase {
  entity: 'telemetry';
  operation: 'push';
  entityId: string;
  payload: UsageEvent;
}

export interface TelemetryClearOperation extends OutboxBase {
  entity: 'telemetry';
  operation: 'clear';
  entityId: null;
  payload: null;
}

export type OutboxOperation =
  | FavoriteUpsertOperation
  | FavoriteDeleteOperation
  | HistoryPushOperation
  | HistoryClearOperation
  | TelemetryPushOperation
  | TelemetryClearOperation;

type NewOperation<T extends OutboxOperation> = Omit<
  T,
  'id' | 'opId' | 'attempts' | 'status' | 'lastAttemptAt'
> & { opId?: string };

export type NewOutboxOperation =
  | NewOperation<FavoriteUpsertOperation>
  | NewOperation<FavoriteDeleteOperation>
  | NewOperation<HistoryPushOperation>
  | NewOperation<HistoryClearOperation>
  | NewOperation<TelemetryPushOperation>
  | NewOperation<TelemetryClearOperation>;

export interface OutboxRepository {
  enqueue(operation: NewOutboxOperation): Promise<OutboxOperation>;
  listPending(): Promise<OutboxOperation[]>;
  markSent(id: number): Promise<void>;
  markFailed(id: number): Promise<void>;
  /**
   * Elimina todas las operaciones de una entidad (pendientes, enviadas y
   * fallidas). Se usa al borrar datos locales para no resucitarlos con el
   * push remoto (R-01).
   */
  purgeByEntity(entity: OutboxEntity): Promise<void>;
}
