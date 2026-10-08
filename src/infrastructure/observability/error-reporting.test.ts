import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sentryMock = {
  moduleLoads: 0,
  init: vi.fn(),
  captureException: vi.fn(),
};

function registerSentryMock(): void {
  vi.doMock('@sentry/react', () => {
    sentryMock.moduleLoads += 1;

    return {
      init: sentryMock.init,
      captureException: sentryMock.captureException,
    };
  });
}

const VALID_DSN = 'https://clave-publica@o4506.ingest.sentry.io/4506';

describe('error-reporting', () => {
  beforeEach(() => {
    sentryMock.moduleLoads = 0;
    sentryMock.init.mockReset();
    sentryMock.captureException.mockReset();
    vi.unstubAllEnvs();
    vi.resetModules();
    registerSentryMock();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock('@sentry/react');
    vi.restoreAllMocks();
  });

  it('sin DSN no importa Sentry, no inicializa y reportError es no-op', async () => {
    const reporting = await import('./error-reporting');

    await reporting.initErrorReporting();
    reporting.reportError(new Error('sin dsn'));

    expect(reporting.isErrorReportingEnabled()).toBe(false);
    expect(sentryMock.moduleLoads).toBe(0);
    expect(sentryMock.init).not.toHaveBeenCalled();
    expect(sentryMock.captureException).not.toHaveBeenCalled();
  });

  it('con DSN inválida tampoco importa Sentry y deja el reporte desactivado', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'no-es-una-url');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const reporting = await import('./error-reporting');

    await reporting.initErrorReporting();

    expect(reporting.isErrorReportingEnabled()).toBe(false);
    expect(sentryMock.moduleLoads).toBe(0);
    expect(sentryMock.init).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it('reportError antes de init es no-op aunque haya DSN', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', VALID_DSN);
    const reporting = await import('./error-reporting');

    reporting.reportError(new Error('demasiado pronto'));

    expect(sentryMock.captureException).not.toHaveBeenCalled();
  });

  it('con DSN válida inicializa Sentry sin trazas y sin recolección de PII', async () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_SENTRY_DSN', VALID_DSN);
    const reporting = await import('./error-reporting');

    await reporting.initErrorReporting();

    expect(reporting.isErrorReportingEnabled()).toBe(true);
    expect(sentryMock.moduleLoads).toBe(1);
    expect(sentryMock.init).toHaveBeenCalledTimes(1);
    expect(sentryMock.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: VALID_DSN,
        environment: 'production',
        tracesSampleRate: 0,
        dataCollection: expect.objectContaining({
          userInfo: false,
          httpBodies: [],
          databaseQueryData: false,
          queues: false,
        }),
      }),
    );
  });

  it('usa VITE_SENTRY_ENVIRONMENT cuando está definido', async () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_SENTRY_DSN', VALID_DSN);
    vi.stubEnv('VITE_SENTRY_ENVIRONMENT', 'staging');
    const reporting = await import('./error-reporting');

    await reporting.initErrorReporting();

    expect(sentryMock.init).toHaveBeenCalledWith(
      expect.objectContaining({ environment: 'staging' }),
    );
  });

  it('beforeSend elimina las cabeceras de la petición (higiene de PII)', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', VALID_DSN);
    const reporting = await import('./error-reporting');
    await reporting.initErrorReporting();

    const options = sentryMock.init.mock.calls[0]?.[0] as {
      beforeSend: (event: BeforeSendEvent) => BeforeSendEvent;
    };
    const event: BeforeSendEvent = {
      request: { headers: { authorization: 'Bearer secreto', cookie: 'sesion=1' } },
    };

    const result = options.beforeSend(event);

    expect(result.request?.headers).toBeUndefined();
  });

  it('reportError tras init captura el error con el contexto en extra', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', VALID_DSN);
    const reporting = await import('./error-reporting');
    await reporting.initErrorReporting();

    const error = new Error('capturar');
    reporting.reportError(error, { ruta: '/favoritos' });

    expect(sentryMock.captureException).toHaveBeenCalledTimes(1);
    expect(sentryMock.captureException).toHaveBeenCalledWith(error, {
      extra: { ruta: '/favoritos' },
    });
  });

  it('reportError tras init sin contexto captura solo el error', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', VALID_DSN);
    const reporting = await import('./error-reporting');
    await reporting.initErrorReporting();

    const error = new Error('capturar');
    reporting.reportError(error);

    expect(sentryMock.captureException).toHaveBeenCalledWith(error);
  });

  it('si Sentry.init lanza, initErrorReporting no lanza y queda desactivado', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', VALID_DSN);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    sentryMock.init.mockImplementationOnce(() => {
      throw new Error('init roto');
    });
    const reporting = await import('./error-reporting');

    await expect(reporting.initErrorReporting()).resolves.toBeUndefined();

    expect(reporting.isErrorReportingEnabled()).toBe(false);
    expect(warn).toHaveBeenCalled();
  });

  it('initErrorReporting es idempotente: una sola inicialización', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', VALID_DSN);
    const reporting = await import('./error-reporting');

    await Promise.all([reporting.initErrorReporting(), reporting.initErrorReporting()]);

    expect(sentryMock.moduleLoads).toBe(1);
    expect(sentryMock.init).toHaveBeenCalledTimes(1);
  });
});

interface BeforeSendEvent {
  request?: {
    headers?: Record<string, string>;
  };
}
