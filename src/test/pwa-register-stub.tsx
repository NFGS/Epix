import { useState } from 'react';

/**
 * Stub de `virtual:pwa-register/react` para Vitest (ver alias en `vite.config.ts`).
 * Los tests controlan el estado con `__setPwaRegisterStub` / `__resetPwaRegisterStub`.
 */

interface PwaRegisterStubState {
  needRefresh: boolean;
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
}

const state: PwaRegisterStubState = {
  needRefresh: false,
  updateServiceWorker: async () => undefined,
};

export function __setPwaRegisterStub(overrides: Partial<PwaRegisterStubState>): void {
  Object.assign(state, overrides);
}

export function __resetPwaRegisterStub(): void {
  state.needRefresh = false;
  state.updateServiceWorker = async () => undefined;
}

export function useRegisterSW(): {
  needRefresh: [boolean, (value: boolean) => void];
  offlineReady: [boolean, (value: boolean) => void];
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
} {
  const [needRefresh, setNeedRefresh] = useState(state.needRefresh);
  const [offlineReady, setOfflineReady] = useState(false);

  return {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker: state.updateServiceWorker,
  };
}
