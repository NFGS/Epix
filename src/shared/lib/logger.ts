/**
 * Logger tipado y sin dependencias (P2-4).
 *
 * - `debug`/`info`: solo en desarrollo; en producción no ensucian la consola.
 * - `warn`/`error`: siempre, para poder diagnosticar en el dispositivo real.
 *
 * Se lee `import.meta.env.DEV` en cada llamada para que las pruebas puedan
 * simular PROD con `vi.stubEnv` sin reimportar el módulo.
 */
export interface Logger {
  debug(...args: readonly unknown[]): void;
  info(...args: readonly unknown[]): void;
  warn(...args: readonly unknown[]): void;
  error(...args: readonly unknown[]): void;
}

function isDevelopment(): boolean {
  return import.meta.env.DEV;
}

export const logger: Logger = {
  debug(...args): void {
    if (isDevelopment()) {
      console.debug(...args);
    }
  },
  info(...args): void {
    if (isDevelopment()) {
      console.info(...args);
    }
  },
  warn(...args): void {
    console.warn(...args);
  },
  error(...args): void {
    console.error(...args);
  },
};
