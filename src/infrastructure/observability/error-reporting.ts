import type * as SentryReact from '@sentry/react';

import { resolveSentryConfig } from '@/shared/lib/env';
import { logger } from '@/shared/lib/logger';

type SentryModule = typeof SentryReact;

let sentryModule: SentryModule | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Inicializa el reporte de errores con Sentry.
 *
 * - Sin `VITE_SENTRY_DSN` válida no hace nada: el SDK ni siquiera se importa
 *   (cero peso en el arranque, cero peticiones externas).
 * - Con DSN, importa `@sentry/react` en un chunk perezoso y lo configura sin
 *   PII (el equivalente en v11 de `sendDefaultPii: false`) y sin trazas.
 * - Nunca lanza: un fallo aquí jamás debe tumbar la app.
 */
export function initErrorReporting(): Promise<void> {
  initPromise ??= initialize();

  return initPromise;
}

async function initialize(): Promise<void> {
  try {
    const config = resolveSentryConfig();

    if (config === null) {
      return;
    }

    const Sentry = await import('@sentry/react');

    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      tracesSampleRate: 0,
      // Sentry v11 eliminó `sendDefaultPii`: `dataCollection` es su reemplazo
      // oficial y aquí replica la postura «sin PII» (documentación de migración
      // v11: userInfo, cuerpos HTTP, GraphQL, GenAI, consultas, colas y cabeceras
      // con datos de identidad fuera).
      dataCollection: {
        userInfo: false,
        httpBodies: [],
        graphQL: { document: false, variables: false },
        genAI: { inputs: false, outputs: false },
        databaseQueryData: false,
        queues: false,
        httpHeaders: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
        cookies: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
        urlQueryParams: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
      },
      beforeSend: (event) => {
        // Higiene básica: fuera cabeceras (tokens, cookies) antes de enviar.
        if (event.request !== undefined) {
          delete event.request.headers;
        }

        return event;
      },
    });

    sentryModule = Sentry;
  } catch (error) {
    logger.warn('Epix: no se pudo inicializar el reporte de errores.', error);
  }
}

/**
 * Reporta un error técnico. No-op si el reporte de errores no está activo.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (sentryModule === null) {
    return;
  }

  if (context === undefined) {
    sentryModule.captureException(error);
    return;
  }

  sentryModule.captureException(error, { extra: context });
}

/** `true` solo cuando Sentry quedó inicializado con una DSN válida. */
export function isErrorReportingEnabled(): boolean {
  return sentryModule !== null;
}
