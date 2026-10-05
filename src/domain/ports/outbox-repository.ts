import type { FavoriteShow } from '@/domain/entities/favorite';
import type { HistoryEntry } from '@/domain/entities/history-entry';

export type OutboxStatus = 'pending' | 'sent' | 'failed';

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

export type OutboxOperation =
  | FavoriteUpsertOperation
  | FavoriteDeleteOperation
  | HistoryPushOperation
  | HistoryClearOperation;

type NewOperation<T extends OutboxOperation> = Omit<
  T,
  'id' | 'opId' | 'attempts' | 'status' | 'lastAttemptAt'
> & { opId?: string };

export type NewOutboxOperation =
  | NewOperation<FavoriteUpsertOperation>
  | NewOperation<FavoriteDeleteOperation>
  | NewOperation<HistoryPushOperation>
  | NewOperation<HistoryClearOperation>;

export interface OutboxRepository {
  enqueue(operation: NewOutboxOperation): Promise<OutboxOperation>;
  listPending(): Promise<OutboxOperation[]>;
  markSent(id: number): Promise<void>;
  markFailed(id: number): Promise<void>;
}
