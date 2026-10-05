import { describe, expect, it } from 'vitest';

import { formatDateTime, formatRelativeDate } from './format';

const LABELS = { today: 'Hoy', yesterday: 'Ayer' };

describe('formatRelativeDate', () => {
  it('usa «Hoy HH:mm» para el mismo día', () => {
    const result = formatRelativeDate('2026-10-05T14:32:00', LABELS, {
      now: new Date(2026, 9, 5, 18, 0),
    });

    expect(result).toBe('Hoy 14:32');
  });

  it('usa «Ayer» para el día anterior', () => {
    const result = formatRelativeDate('2026-10-04T09:00:00', LABELS, {
      now: new Date(2026, 9, 5, 8, 0),
    });

    expect(result).toBe('Ayer');
  });

  it('usa «12 sep» para fechas del mismo año', () => {
    const result = formatRelativeDate('2026-09-12T10:00:00', LABELS, {
      now: new Date(2026, 9, 5, 8, 0),
    });

    expect(result).toBe('12 sep');
  });

  it('añade el año cuando es distinto', () => {
    const result = formatRelativeDate('2025-09-12T10:00:00', LABELS, {
      now: new Date(2026, 9, 5, 8, 0),
    });

    expect(result).toBe('12 sep 2025');
  });

  it('soporta etiquetas y meses en inglés', () => {
    const result = formatRelativeDate(
      '2026-09-12T10:00:00',
      { today: 'Today', yesterday: 'Yesterday' },
      { now: new Date(2026, 9, 5, 8, 0), language: 'en' },
    );

    expect(result).toBe('Sep 12');
  });

  it('devuelve cadena vacía ante fechas inválidas', () => {
    expect(formatRelativeDate('no-es-fecha', LABELS)).toBe('');
    expect(formatDateTime('no-es-fecha', 'es')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('formatea fecha y hora para la última sincronización', () => {
    const result = formatDateTime('2026-10-05T14:32:00.000Z', 'es');

    expect(result).not.toBe('');
    expect(result).toMatch(/2026/);
  });
});
