import {
  sanitizePayload,
  type UsageEvent,
  type UsageEventType,
} from '@/domain/entities/usage-event';
import type { OutboxRepository } from '@/domain/ports/outbox-repository';
import type { TelemetryPort } from '@/domain/ports/telemetry';
import type { UsageEventsRepository } from '@/domain/ports/usage-events-repository';
import { currentTimezone, nowIso, randomId } from '@/shared/lib/clock';

/** Preferencias mínimas que condicionan el registro de telemetría. */
export interface TelemetryPreferences {
  telemetryEnabled: boolean;
  country: string | null;
}

export interface TelemetryServiceOptions {
  eventsRepo: UsageEventsRepository;
  outbox: OutboxRepository;
  getPreferences: () => Promise<TelemetryPreferences>;
  /** Reloj inyectable; por defecto `new Date().toISOString()`. */
  now?: () => string;
  uuid?: () => string;
  timezone?: () => string;
  /** Versión publicada en el build (`__APP_VERSION__`). */
  appVersion?: string;
}

/**
 * Servicio de telemetría (RF-11). Respeta el consentimiento (CA-11.2),
 * enriquece cada evento y lo persiste + encola para sincronizar.
 * **Nunca lanza**: un fallo de telemetría jamás rompe la app (RNF-03).
 */
export function createTelemetryService(options: TelemetryServiceOptions): TelemetryPort {
  const now = options.now ?? nowIso;
  const uuid = options.uuid ?? randomId;
  const timezone = options.timezone ?? currentTimezone;
  const appVersion = options.appVersion ?? __APP_VERSION__;

  return {
    async track(eventType: UsageEventType, payload?: Record<string, unknown>): Promise<void> {
      try {
        const preferences = await options.getPreferences();

        // CA-11.2: sin consentimiento no se escribe ni se encola absolutamente nada.
        if (!preferences.telemetryEnabled) {
          return;
        }

        const occurredAt = now();
        const sanitized = sanitizePayload(payload);
        const country = preferences.country;

        const event: UsageEvent = {
          id: uuid(),
          eventType,
          occurredAt,
          timezone: timezone(),
          appVersion,
          ...(country !== null && country !== '' ? { country } : {}),
          ...(sanitized === undefined ? {} : { payload: sanitized }),
        };

        await options.eventsRepo.add(event);
        await options.outbox.enqueue({
          entity: 'telemetry',
          operation: 'push',
          entityId: event.id,
          payload: event,
          opId: event.id,
          createdAt: occurredAt,
        });
      } catch {
        // La telemetría es best-effort: se descarta el evento y la app sigue.
      }
    },
  };
}
