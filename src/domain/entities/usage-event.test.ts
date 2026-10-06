import { describe, expect, it } from 'vitest';

import { sanitizePayload } from './usage-event';

describe('sanitizePayload', () => {
  it('devuelve undefined cuando no recibe payload', () => {
    expect(sanitizePayload(undefined)).toBeUndefined();
  });

  it('conserva escalares serializables y null', () => {
    expect(
      sanitizePayload({
        query: 'lost',
        count: 12,
        enabled: true,
        country: null,
      }),
    ).toEqual({ query: 'lost', count: 12, enabled: true, country: null });
  });

  it('elimina claves sensibles en cualquier nivel', () => {
    const cleaned = sanitizePayload({
      search: 'ok',
      token: 'secreto',
      password: '1234',
      user: { email: 'a@b.co', name: 'Fabián' },
      latitude: 4.53,
      accuracy: 10,
    });

    expect(cleaned).toEqual({ search: 'ok', user: { name: 'Fabián' }, accuracy: 10 });
  });

  it('recorta cadenas de más de 200 caracteres con elipsis', () => {
    const long = 'x'.repeat(250);
    const cleaned = sanitizePayload({ query: long });

    expect(cleaned?.query).toBe(`${'x'.repeat(200)}…`);
  });

  it('sustituye números no finitos por null', () => {
    expect(sanitizePayload({ a: Number.NaN, b: Number.POSITIVE_INFINITY, c: 3.5 })).toEqual({
      a: null,
      b: null,
      c: 3.5,
    });
  });

  it('descarta funciones, undefined y símbolos', () => {
    const cleaned = sanitizePayload({
      valid: 1,
      fn: () => 'no',
      missing: undefined,
      symbol: Symbol('x'),
    });

    expect(cleaned).toEqual({ valid: 1 });
  });

  it('limpia arreglos conservando solo valores útiles', () => {
    const cleaned = sanitizePayload({
      genres: ['Drama', undefined, () => 'no', Number.NaN],
      empty: [],
    });

    expect(cleaned).toEqual({ genres: ['Drama', null], empty: [] });
  });

  it('limita la profundidad del payload a 4 niveles', () => {
    const cleaned = sanitizePayload({
      level1: { level2: { level3: { level4: 'ok' } } },
      deep: { level2: { level3: { level4: { level5: { level6: 'fuera' } } } } },
    });

    expect(cleaned).toEqual({
      level1: { level2: { level3: { level4: 'ok' } } },
      deep: { level2: { level3: { level4: {} } } },
    });
  });

  it('devuelve undefined si todo el payload era sensible o vacío', () => {
    expect(sanitizePayload({ token: 'x' })).toBeUndefined();
    expect(sanitizePayload({})).toBeUndefined();
    expect(sanitizePayload({ fn: () => 'no' })).toBeUndefined();
  });
});
