import { vi } from 'vitest';

import type { AuthUser, CloudAuth } from '@/application/ports/auth';

export interface FakeAuth {
  auth: CloudAuth;
  /** Simula un evento de `onAuthStateChange`. */
  emit(user: AuthUser | null): void;
  listeners: Set<(user: AuthUser | null) => void>;
}

/** Doble de `CloudAuth` para pruebas, con emisión manual de eventos de sesión. */
export function createFakeAuth(overrides: Partial<CloudAuth> = {}): FakeAuth {
  const listeners = new Set<(user: AuthUser | null) => void>();

  const auth: CloudAuth = {
    sendEmailOtp: vi.fn(async () => undefined),
    verifyEmailOtp: vi.fn(async () => ({ id: 'user-1', email: 'ana@example.com' })),
    linkEmail: vi.fn(async () => undefined),
    verifyEmailChange: vi.fn(async () => ({ id: 'user-1', email: 'ana@example.com' })),
    signOut: vi.fn(async () => undefined),
    getUser: vi.fn(async () => null),
    onAuthStateChange: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    ...overrides,
  };

  return {
    auth,
    listeners,
    emit(user) {
      for (const listener of listeners) {
        listener(user);
      }
    },
  };
}
