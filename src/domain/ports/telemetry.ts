import type { UsageEvent, UsageEventType } from '@/domain/entities/usage-event';

/**
 * Puerto de telemetría: la app lo usa para registrar eventos sin conocer
 * Dexie, Supabase ni React. La implementación nunca lanza (RF-11 / RNF-03).
 */
export interface TelemetryPort {
  track(eventType: UsageEventType, payload?: Record<string, unknown>): Promise<void>;
}

export type { UsageEvent };
