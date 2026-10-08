import { describe, expect, it, vi } from 'vitest';

import { webcrypto } from 'node:crypto';

import {
  isAirdateInWindow,
  scheduleDateWindow,
} from '../supabase/functions/epix-push/airdate-window';
import {
  corsDecision,
  DEFAULT_ALLOWED_ORIGIN,
  resolveAllowedOrigins,
} from '../supabase/functions/epix-push/cors';
import { isTrustedPushEndpoint } from '../supabase/functions/epix-push/push-endpoint';
import {
  sha256Digest,
  timingSafeEqual,
  timingSafeStringEqual,
} from '../supabase/functions/epix-push/timing-safe';

// jsdom no implementa `crypto.subtle`; se inyecta el de Node para el helper.
vi.stubGlobal('crypto', webcrypto);

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

describe('isTrustedPushEndpoint (E-04)', () => {
  it.each([
    ['FCM (Chrome/Edge)', 'https://fcm.googleapis.com/fcm/send/abc123'],
    ['Safari', 'https://web.push.apple.com/QG8xY2Q'],
    ['Firefox', 'https://updates.push.services.mozilla.com/wpush/v2/xyz'],
    ['Windows (WNS)', 'https://wns2-par02p.notify.windows.com/w/?token=abc'],
  ])('acepta endpoints de %s', (_case, endpoint) => {
    expect(isTrustedPushEndpoint(endpoint)).toBe(true);
  });

  it.each([
    ['host arbitrario', 'https://evil.example/push'],
    ['http sin TLS', 'http://fcm.googleapis.com/fcm/send/abc'],
    ['sufijo embebido', 'https://fcm.googleapis.com.evil.example/fcm'],
    ['userinfo engañoso', 'https://fcm.googleapis.com@evil.example/push'],
    ['URL no válida', 'no-es-una-url'],
    ['vacío', ''],
    ['esquema javascript', 'javascript:alert(1)'],
  ])('rechaza %s', (_case, endpoint) => {
    expect(isTrustedPushEndpoint(endpoint)).toBe(false);
  });
});

describe('timing-safe (E-01)', () => {
  it('calcula el SHA-256 esperado', async () => {
    expect(toHex(await sha256Digest(''))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('compara digests iguales y distintos sin error', async () => {
    const [a, b, c] = await Promise.all([
      sha256Digest('secreto-de-prueba'),
      sha256Digest('secreto-de-prueba'),
      sha256Digest('secreto-de-pruebA'),
    ]);

    expect(timingSafeEqual(a, b)).toBe(true);
    expect(timingSafeEqual(a, c)).toBe(false);
  });

  it('devuelve false con longitudes distintas', () => {
    expect(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false);
  });

  it('compara cadenas completas', async () => {
    expect(await timingSafeStringEqual('abc', 'abc')).toBe(true);
    expect(await timingSafeStringEqual('abc', 'abd')).toBe(false);
  });
});

describe('corsDecision (E-02)', () => {
  it('permite el origen de producción por defecto y anuncia solo cabeceras seguras', () => {
    const decision = corsDecision(DEFAULT_ALLOWED_ORIGIN, undefined);

    expect(decision.allowed).toBe(true);
    expect(decision.headers['Access-Control-Allow-Origin']).toBe(DEFAULT_ALLOWED_ORIGIN);
    expect(decision.headers['Access-Control-Allow-Headers']).toBe(
      'authorization, content-type, apikey',
    );
    expect(decision.headers['Access-Control-Allow-Headers']).not.toContain('x-cron-secret');
    expect(decision.headers['Access-Control-Allow-Methods']).toBe('POST, OPTIONS');
  });

  it('permite localhost para desarrollo', () => {
    expect(corsDecision('http://localhost:5173', undefined).allowed).toBe(true);
    expect(corsDecision('http://127.0.0.1:5173', undefined).allowed).toBe(true);
  });

  it('fusiona orígenes extra de ALLOWED_ORIGIN sin duplicados', () => {
    const origins = resolveAllowedOrigins(
      ` https://preview.epix.test , ${DEFAULT_ALLOWED_ORIGIN} ,,`,
    );

    expect(origins).toContain('https://preview.epix.test');
    expect(origins.filter((origin) => origin === DEFAULT_ALLOWED_ORIGIN)).toHaveLength(1);
  });

  it('rechaza un origen desconocido sin cabeceras', () => {
    const decision = corsDecision('https://malicioso.example', undefined);

    expect(decision.allowed).toBe(false);
    expect(decision.headers).toEqual({});
  });

  it('acepta peticiones sin Origin (cron servidor→servidor) sin CORS', () => {
    expect(corsDecision(null, undefined)).toEqual({ allowed: true, headers: {} });
    expect(corsDecision('', undefined)).toEqual({ allowed: true, headers: {} });
  });
});

describe('scheduleDateWindow (P-10)', () => {
  it('a las 02:00 UTC el «hoy» local (UTC-5) sigue siendo el día anterior', () => {
    const window = scheduleDateWindow(new Date('2026-10-07T02:00:00.000Z'));

    expect(window).toEqual({ today: '2026-10-06', yesterday: '2026-10-05' });
    expect(isAirdateInWindow('2026-10-06', new Date('2026-10-07T02:00:00.000Z'))).toBe(true);
    expect(isAirdateInWindow('2026-10-05', new Date('2026-10-07T02:00:00.000Z'))).toBe(true);
    expect(isAirdateInWindow('2026-10-07', new Date('2026-10-07T02:00:00.000Z'))).toBe(false);
    expect(isAirdateInWindow('2026-10-04', new Date('2026-10-07T02:00:00.000Z'))).toBe(false);
  });

  it('en horario diurno UTC coincide con el día local', () => {
    expect(scheduleDateWindow(new Date('2026-10-07T18:00:00.000Z'))).toEqual({
      today: '2026-10-07',
      yesterday: '2026-10-06',
    });
  });

  it('cruza el cambio de mes sin desbordar', () => {
    expect(scheduleDateWindow(new Date('2026-11-01T02:00:00.000Z'))).toEqual({
      today: '2026-10-31',
      yesterday: '2026-10-30',
    });
  });
});
