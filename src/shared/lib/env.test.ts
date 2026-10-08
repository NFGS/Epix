import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveAppEnv, resolveVapidPublicKey } from './env';

const VALID_URL = 'https://epix.supabase.co';
const VALID_KEY = 'anon-key-de-prueba';

describe('resolveAppEnv', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('con URL y anon key válidas expone la configuración de Supabase', () => {
    const env = resolveAppEnv({
      MODE: 'production',
      DEV: false,
      PROD: true,
      VITE_SUPABASE_URL: VALID_URL,
      VITE_SUPABASE_ANON_KEY: VALID_KEY,
    });

    expect(env).toEqual({
      mode: 'production',
      isDev: false,
      isProd: true,
      supabase: { url: VALID_URL, anonKey: VALID_KEY },
    });
  });

  it('normaliza espacios alrededor de la URL y la clave', () => {
    const env = resolveAppEnv({
      VITE_SUPABASE_URL: `  ${VALID_URL}  `,
      VITE_SUPABASE_ANON_KEY: `  ${VALID_KEY}  `,
    });

    expect(env.supabase).toEqual({ url: VALID_URL, anonKey: VALID_KEY });
  });

  it('sin variables de Supabase usa modo solo local', () => {
    const env = resolveAppEnv({ MODE: 'test', DEV: true, PROD: false });

    expect(env.supabase).toBeNull();
    expect(env.mode).toBe('test');
    expect(env.isDev).toBe(true);
    expect(env.isProd).toBe(false);
  });

  it('con variables vacías usa modo solo local', () => {
    const env = resolveAppEnv({
      VITE_SUPABASE_URL: '   ',
      VITE_SUPABASE_ANON_KEY: '   ',
    });

    expect(env.supabase).toBeNull();
  });

  it('con la URL definida pero inválida avisa una vez y cae a solo local', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const env = resolveAppEnv({
      VITE_SUPABASE_URL: 'no-es-una-url',
      VITE_SUPABASE_ANON_KEY: VALID_KEY,
    });

    expect(env.supabase).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);

    resolveAppEnv({
      VITE_SUPABASE_URL: 'tampoco-es-url',
      VITE_SUPABASE_ANON_KEY: VALID_KEY,
    });

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('con URL válida pero sin anon key usa modo solo local sin avisar', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const env = resolveAppEnv({ VITE_SUPABASE_URL: VALID_URL });

    expect(env.supabase).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('usa valores por defecto seguros si MODE/DEV/PROD no son válidos', () => {
    const env = resolveAppEnv({
      MODE: undefined,
      DEV: undefined,
      PROD: undefined,
      VITE_SUPABASE_URL: VALID_URL,
      VITE_SUPABASE_ANON_KEY: VALID_KEY,
    });

    expect(env.mode).toBe('production');
    expect(env.isDev).toBe(false);
    expect(env.isProd).toBe(true);
  });
});

describe('resolveVapidPublicKey', () => {
  it('sin variable devuelve null (push deshabilitado)', () => {
    expect(resolveVapidPublicKey({})).toBeNull();
  });

  it('con variable vacía o solo espacios devuelve null', () => {
    expect(resolveVapidPublicKey({ VITE_VAPID_PUBLIC_KEY: '   ' })).toBeNull();
  });

  it('normaliza los espacios alrededor de la clave', () => {
    expect(resolveVapidPublicKey({ VITE_VAPID_PUBLIC_KEY: '  clave-vapid  ' })).toBe(
      'clave-vapid',
    );
  });
});
