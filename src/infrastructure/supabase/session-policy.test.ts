import { describe, expect, it, vi } from 'vitest';

import {
  clearSignedOutMark,
  isSignedOutExplicitly,
  markSignedOut,
  SIGNED_OUT_STORAGE_KEY,
  type SessionPolicyStorage,
} from './session-policy';

function createStorage(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    raw: store,
  };
}

describe('session-policy', () => {
  it('sin marca, la sesión no está cerrada explícitamente', () => {
    const storage = createStorage();

    expect(isSignedOutExplicitly(storage)).toBe(false);
  });

  it('markSignedOut marca y clearSignedOutMark limpia', () => {
    const storage = createStorage();

    markSignedOut(storage);
    expect(isSignedOutExplicitly(storage)).toBe(true);
    expect(storage.raw.get(SIGNED_OUT_STORAGE_KEY)).toBe('1');

    clearSignedOutMark(storage);
    expect(isSignedOutExplicitly(storage)).toBe(false);
  });

  it('un almacén que lanza errores degrada sin romper', () => {
    const broken: SessionPolicyStorage = {
      getItem: () => {
        throw new Error('modo privado');
      },
      setItem: () => {
        throw new Error('modo privado');
      },
      removeItem: () => {
        throw new Error('modo privado');
      },
    };

    expect(isSignedOutExplicitly(broken)).toBe(false);
    expect(() => markSignedOut(broken)).not.toThrow();
    expect(() => clearSignedOutMark(broken)).not.toThrow();
  });

  it('sin almacenamiento no falla', () => {
    expect(isSignedOutExplicitly(null)).toBe(false);
    expect(() => markSignedOut(null)).not.toThrow();
    expect(() => clearSignedOutMark(null)).not.toThrow();
  });
});
