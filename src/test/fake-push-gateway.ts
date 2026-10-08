import { vi } from 'vitest';

import type { PushGateway, PushState } from '@/application/ports/push-gateway';

/** Doble de `PushGateway` para pruebas (por defecto: soportado y sin suscripción). */
export function createFakePushGateway(overrides: Partial<PushGateway> = {}): PushGateway {
  return {
    isSupported: vi.fn(() => true),
    getState: vi.fn(async (): Promise<PushState> => ({ status: 'none' })),
    subscribe: vi.fn(async () => ({ endpoint: 'https://push.test/epix-1' })),
    unsubscribe: vi.fn(async () => undefined),
    release: vi.fn(async () => undefined),
    sendTest: vi.fn(async () => ({ ok: true })),
    ...overrides,
  };
}
