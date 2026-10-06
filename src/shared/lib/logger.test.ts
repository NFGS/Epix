import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from './logger';

describe('logger', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('warn y error llegan siempre a la consola', () => {
    vi.stubEnv('DEV', false);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    logger.warn('aviso', { status: 429 });
    logger.error('fallo irrecuperable');

    expect(warn).toHaveBeenCalledWith('aviso', { status: 429 });
    expect(error).toHaveBeenCalledWith('fallo irrecuperable');
  });

  it('debug e info llegan a la consola en desarrollo', () => {
    vi.stubEnv('DEV', true);
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    logger.debug('detalle');
    logger.info('arranque');

    expect(debug).toHaveBeenCalledWith('detalle');
    expect(info).toHaveBeenCalledWith('arranque');
  });

  it('debug e info son silenciosos en producción', () => {
    vi.stubEnv('DEV', false);
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    logger.debug('no debe salir');
    logger.info('tampoco');

    expect(debug).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
  });
});
