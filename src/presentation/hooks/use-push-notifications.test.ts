import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { PushGateway, PushState } from '@/application/ports/push-gateway';
import { DependenciesContext } from '@/presentation/hooks/dependencies-context';
import { createFakePushGateway } from '@/test/fake-push-gateway';
import { createTestDependencies } from '@/test/test-dependencies';

import { usePushNotifications } from './use-push-notifications';

const VAPID_KEY = 'clave-vapid-de-prueba';

function subscribed(endpoint: string): PushState {
  return { status: 'subscribed', endpoint };
}

function renderPush(push: PushGateway, vapidPublicKey: string | null = VAPID_KEY) {
  const dependencies = createTestDependencies({ push });

  return renderHook(() => usePushNotifications({ vapidPublicKey }), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(DependenciesContext.Provider, { value: dependencies }, children),
  });
}

describe('usePushNotifications', () => {
  it('sin clave VAPID queda unsupported y enable no suscribe', async () => {
    const push = createFakePushGateway();
    const { result } = renderPush(push, null);

    expect(result.current.isAvailable).toBe(false);
    expect(result.current.status).toBe('unsupported');

    let outcome = true;
    await act(async () => {
      outcome = await result.current.enable();
    });

    expect(outcome).toBe(false);
    expect(push.subscribe).not.toHaveBeenCalled();
    expect(push.getState).not.toHaveBeenCalled();
  });

  it('sin soporte del navegador queda unsupported aunque haya clave', () => {
    const push = createFakePushGateway({ isSupported: () => false });
    const { result } = renderPush(push);

    expect(result.current.isAvailable).toBe(false);
    expect(result.current.status).toBe('unsupported');
  });

  it('detecta una suscripción existente al montar', async () => {
    const push = createFakePushGateway({
      getState: vi.fn(async (): Promise<PushState> => subscribed('https://push.test/epix-1')),
    });
    const { result } = renderPush(push);

    await waitFor(() => {
      expect(result.current.status).toBe('subscribed');
    });
    expect(result.current.errorAction).toBeNull();
  });

  it('si la consulta inicial devuelve error queda error con errorAction query (P-06)', async () => {
    const push = createFakePushGateway({
      getState: vi.fn(
        async (): Promise<PushState> => ({ status: 'error', code: 'query' }),
      ),
    });
    const { result } = renderPush(push);

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.errorAction).toBe('query');
  });

  it('si la consulta inicial rechaza queda error con errorAction query (P-06)', async () => {
    const push = createFakePushGateway({
      getState: vi.fn(async (): Promise<PushState> => {
        throw new Error('pushManager roto');
      }),
    });
    const { result } = renderPush(push);

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.errorAction).toBe('query');
  });

  it('enable suscribe con la clave VAPID y pasa a subscribed', async () => {
    const push = createFakePushGateway();
    const { result } = renderPush(push);

    let outcome = false;
    await act(async () => {
      outcome = await result.current.enable();
    });

    expect(outcome).toBe(true);
    expect(push.subscribe).toHaveBeenCalledWith(VAPID_KEY);
    expect(result.current.status).toBe('subscribed');
    expect(result.current.errorAction).toBeNull();
  });

  it('ignora un segundo toque mientras está ready (P-03)', async () => {
    let resolveSubscribe: (() => void) | null = null;
    const subscribe = vi.fn(
      () =>
        new Promise<{ endpoint: string }>((resolve) => {
          resolveSubscribe = () => resolve({ endpoint: 'https://push.test/epix-1' });
        }),
    );
    const push = createFakePushGateway({ subscribe });
    const { result } = renderPush(push);

    let first: Promise<boolean> = Promise.resolve(false);
    let second: Promise<boolean> = Promise.resolve(false);

    act(() => {
      first = result.current.enable();
      second = result.current.enable();
    });

    expect(result.current.status).toBe('ready');
    expect(await second).toBe(false);
    expect(subscribe).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSubscribe?.();
      await first;
    });

    expect(result.current.status).toBe('subscribed');
  });

  it('disable desuscribe y pasa a disabled', async () => {
    const push = createFakePushGateway({
      getState: vi.fn(async (): Promise<PushState> => subscribed('https://push.test/epix-1')),
    });
    const { result } = renderPush(push);

    await waitFor(() => {
      expect(result.current.status).toBe('subscribed');
    });

    let outcome = false;
    await act(async () => {
      outcome = await result.current.disable();
    });

    expect(outcome).toBe(true);
    expect(push.unsubscribe).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('disabled');
  });

  it('si el navegador no quedó suscrito tras fallar enable, refleja disabled (P-07)', async () => {
    const push = createFakePushGateway({
      subscribe: vi.fn(async () => {
        throw new Error('permiso denegado');
      }),
      getState: vi.fn(async (): Promise<PushState> => ({ status: 'none' })),
    });
    const { result } = renderPush(push);

    let outcome = true;
    await act(async () => {
      outcome = await result.current.enable();
    });

    expect(outcome).toBe(false);
    expect(result.current.status).toBe('disabled');
    expect(result.current.errorAction).toBe('enable');
  });

  it('si el navegador sí quedó suscrito pero guardar falla, refleja subscribed (P-06/P-07)', async () => {
    const push = createFakePushGateway({
      subscribe: vi.fn(async () => {
        throw new Error('sin red');
      }),
      getState: vi.fn(async (): Promise<PushState> => subscribed('https://push.test/epix-1')),
    });
    const { result } = renderPush(push);

    let outcome = true;
    await act(async () => {
      outcome = await result.current.enable();
    });

    expect(outcome).toBe(false);
    expect(result.current.status).toBe('subscribed');
    expect(result.current.errorAction).toBe('enable');
  });

  it('si desactivar falla, re-comprueba y deja errorAction disable (P-06/P-07)', async () => {
    const push = createFakePushGateway({
      getState: vi.fn(async (): Promise<PushState> => subscribed('https://push.test/epix-1')),
      unsubscribe: vi.fn(async () => {
        throw new Error('bloqueado');
      }),
    });
    const { result } = renderPush(push);

    await waitFor(() => {
      expect(result.current.status).toBe('subscribed');
    });

    let outcome = true;
    await act(async () => {
      outcome = await result.current.disable();
    });

    expect(outcome).toBe(false);
    expect(result.current.status).toBe('subscribed');
    expect(result.current.errorAction).toBe('disable');
  });

  it('sendTest informa el resultado sin cambiar el estado', async () => {
    const push = createFakePushGateway();
    const { result } = renderPush(push);

    let outcome = false;
    await act(async () => {
      outcome = await result.current.sendTest();
    });

    expect(outcome).toBe(true);
    expect(push.sendTest).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('disabled');
  });

  it('sendTest devuelve false cuando la Edge Function falla', async () => {
    const push = createFakePushGateway({
      sendTest: vi.fn(async () => ({ ok: false, error: 'sin sesión' })),
    });
    const { result } = renderPush(push);

    let outcome = true;
    await act(async () => {
      outcome = await result.current.sendTest();
    });

    expect(outcome).toBe(false);
  });

  it('sendTest devuelve false si el gateway lanza (contrato defensivo)', async () => {
    const push = createFakePushGateway({
      sendTest: vi.fn(async () => {
        throw new Error('boom');
      }),
    });
    const { result } = renderPush(push);

    let outcome = true;
    await act(async () => {
      outcome = await result.current.sendTest();
    });

    expect(outcome).toBe(false);
  });
});
