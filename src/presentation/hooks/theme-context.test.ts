import { describe, expect, it } from 'vitest';

import { resolveTheme } from './theme-context';

describe('resolveTheme', () => {
  it('respeta las preferencias explícitas', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('sigue el tema del sistema cuando la preferencia es "system"', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});
