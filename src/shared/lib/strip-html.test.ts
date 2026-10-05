import { afterEach, describe, expect, it, vi } from 'vitest';

import { stripHtml } from './strip-html';

describe('stripHtml', () => {
  it('convierte HTML de TVmaze en texto plano', () => {
    expect(stripHtml('<p>Cuatro <b>amigas</b> en Nueva York.</p>')).toBe(
      'Cuatro amigas en Nueva York.',
    );
  });

  it('decodifica entidades y colapsa espacios', () => {
    expect(stripHtml('<p>Rock &amp; Roll</p>\n<p>en   vivo</p>')).toBe('Rock & Roll en vivo');
  });

  it('devuelve cadena vacía ante null o undefined', () => {
    expect(stripHtml(null)).toBe('');
    expect(stripHtml(undefined)).toBe('');
  });

  it('usa el fallback sin DOMParser', () => {
    vi.stubGlobal('DOMParser', undefined);
    try {
      expect(stripHtml('<p>Hola <b>mundo</b></p>')).toBe('Hola mundo');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
