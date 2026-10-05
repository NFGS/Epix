import type { UsageEvent } from '@/domain/entities/usage-event';

/**
 * Persistencia local de eventos de uso (`usage_events`).
 * El repositorio poda los más antiguos para acotar el almacenamiento.
 */
export interface UsageEventsRepository {
  add(event: UsageEvent): Promise<void>;
  /** Eventos más recientes primero; sin `limit` devuelve todos. */
  list(limit?: number): Promise<UsageEvent[]>;
  clear(): Promise<void>;
}
