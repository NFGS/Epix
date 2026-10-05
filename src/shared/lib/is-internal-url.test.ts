import { describe, expect, it } from 'vitest';

import { isInternalUrl } from './is-internal-url';

describe('isInternalUrl', () => {
  it('acepta rutas internas del mismo origen', () => {
    expect(isInternalUrl('/')).toBe(true);
    expect(isInternalUrl('/shows/1')).toBe(true);
    expect(isInternalUrl('/shows/1?tab=episodes#top')).toBe(true);
  });

  it('rechaza URLs absolutas y externas', () => {
    expect(isInternalUrl('https://x')).toBe(false);
    expect(isInternalUrl('http://localhost:4173/shows/1')).toBe(false);
    expect(isInternalUrl('javascript:alert(1)')).toBe(false);
    expect(isInternalUrl('')).toBe(false);
  });

  it('rechaza protocol-relative y el bypass con barras invertidas', () => {
    expect(isInternalUrl('//evil.com')).toBe(false);
    expect(isInternalUrl('//evil.com/shows/1')).toBe(false);
    expect(isInternalUrl('/\\evil')).toBe(false);
    expect(isInternalUrl('/\\evil.com')).toBe(false);
  });

  it('rechaza cualquier ruta que el parser resuelva a otro origen', () => {
    expect(isInternalUrl('/\\@evil.com')).toBe(false);
  });
});
