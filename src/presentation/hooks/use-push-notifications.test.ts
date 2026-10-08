import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  PushError,
  type PushSubscriptionLike,
  type PushSubscriptionLookup,
} from '@/infrastructure/notifications/push';

import { usePushNotifications, type PushClient, type PushStore } from './use-push-notifications';

const VAPID_KEY = 'clave-vapid-de-prueba';

function createSubscription(): PushSubscriptionLike {
  return {
    endpoint: 'https://push.example/epix-1',
    toJSON: () => ({
      endpoint: 'https://push.example/epix-1',
      keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
    }),
    unsubscribe: vi.fn(async () => true),
  };
}

function lookupOf(subscription: PushSubscriptionLike | null): PushSubscriptionLookup {
  return subscription === null ? { status: 'none' } : { status: 'subscription', subscription };
}

function createClient(overrides: Partial<PushClient> = {}): PushClient {
  return {
    isSupported: () => true,
    subscribe: vi.fn(async () => createSubscription()),
    getSubscription: vi.fn(async () => lookupOf(null)),
    unsubscribe: vi.fn(async () => true),
    ...overrides,
  };
}

function createStore(overrides: Partial<PushStore> = {}): PushStore {
  return {
    save: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    sendTest: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('usePushNotifications', () => {
  it('sin clave VAPID queda unsupported y enable no suscribe', async () => {
    const client = createClient();
    const { result } = renderHook(() =>
      usePushNotifications({ vapidPublicKey: null, client, store: createStore() }),
    );

    expect(result.current.isAvailable).toBe(false);
    expect(result.current.status).toBe('unsupported');

    let outcome = true;
    await act(async () => {
      outcome = await result.current.enable();
    });

    expect(outcome).toBe(false);
    expect(client.subscribe).not.toHaveBeenCalled();
  });

  it('sin soporte del navegador queda unsupported aunque haya clave', () => {
    const { result } = renderHook(() =>
      usePushNotifications({
        vapidPublicKey: VAPID_KEY,
        client: createClient({ isSupported: () => false }),
        store: createStore(),
      }),
    );

    expect(result.current.isAvailable).toBe(false);
    expect(result.current.status).toBe('unsupported');
  });

  it('detecta una suscripción existente al montar', async () => {
    const subscription = createSubscription();
    const client = createClient({
      getSubscription: vi.fn(async () => lookupOf(subscription)),
    });

    const { result } = renderHook(() =>
      usePushNotifications({ vapidPublicKey: VAPID_KEY, client, store: createStore() }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe('subscribed');
    });
    expect(result.current.errorAction).toBeNull();
  });

  it('si la consulta inicial falla queda error con errorAction query (P-06)', async () => {
    const client = createClient({
      getSubscription: vi.fn(async (): Promise<PushSubscriptionLookup> => ({
        status: 'error',
        error: new PushError('query', 'pushManager roto'),
      })),
    });

    const { result } = renderHook(() =>
      usePushNotifications({ vapidPublicKey: VAPID_KEY, client, store: createStore() }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.errorAction).toBe('query');
  });

  it('enable suscribe, guarda la suscripción y pasa a subscribed', async () => {
    const subscription = createSubscription();
    const client = createClient({ subscribe: vi.fn(async () => subscription) });
    const store = createStore();

    const { result } = renderHook(() =>
      usePushNotifications({ vapidPublicKey: VAPID_KEY, client, store }),
    );

    let outcome = false;
    await act(async () => {
      outcome = await result.current.enable();
    });

    expect(outcome).toBe(true);
    expect(client.subscribe).toHaveBeenCalledWith(VAPID_KEY);
    expect(store.save).toHaveBeenCalledWith({
      endpoint: 'https://push.example/epix-1',
      p256dh: 'p256dh-key',
      auth: 'auth-key',
    });
    expect(result.current.status).toBe('subscribed');
    expect(result.current.errorAction).toBeNull();
  });

  it('ignora un segundo toque mientras está ready (P-03)', async () => {
    let resolveSubscribe: ((subscription: PushSubscriptionLike) => void) | null = null;
    const subscribe = vi.fn(
      () =>
        new Promise<PushSubscriptionLike>((resolve) => {
          resolveSubscribe = resolve;
        }),
    );
    const client = createClient({ subscribe });
    const store = createStore();

    const { result } = renderHook(() =>
      usePushNotifications({ vapidPublicKey: VAPID_KEY, client, store }),
    );

    let first: Promise<boolean> = Promise.resolve(false);
    let second: Promise<boolean> = Promise.resolve(false);

    act(() => {
      first = result.current.enable();
      second = result.current.enable();
    });

    expect(result.current.status).toBe('ready');
    expect(await second).toBe(false);
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(store.save).not.toHaveBeenCalled();

    await act(async () => {
      resolveSubscribe?.(createSubscription());
      await first;
    });

    expect(result.current.status).toBe('subscribed');
  });

  it('disable desuscribe, borra el endpoint y pasa a disabled', async () => {
    const subscription = createSubscription();
    const client = createClient({
      getSubscription: vi.fn(async () => lookupOf(subscription)),
      unsubscribe: vi.fn(async () => true),
    });
    const store = createStore();

    const { result } = renderHook(() =>
      usePushNotifications({ vapidPublicKey: VAPID_KEY, client, store }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe('subscribed');
    });

    let outcome = false;
    await act(async () => {
      outcome = await result.current.disable();
    });

    expect(outcome).toBe(true);
    expect(client.unsubscribe).toHaveBeenCalledTimes(1);
    expect(store.remove).toHaveBeenCalledWith('https://push.example/epix-1');
    expect(result.current.status).toBe('disabled');
  });

  it('si el navegador no quedó suscrito tras fallar enable, refleja disabled (P-07)', async () => {
    const client = createClient({
      subscribe: vi.fn(async () => {
        throw new Error('permiso denegado');
      }),
    });
    const store = createStore();

    const { result } = renderHook(() =>
      usePushNotifications({ vapidPublicKey: VAPID_KEY, client, store }),
    );

    let outcome = true;
    await act(async () => {
      outcome = await result.current.enable();
    });

    expect(outcome).toBe(false);
    expect(store.save).not.toHaveBeenCalled();
    expect(result.current.status).toBe('disabled');
    expect(result.current.errorAction).toBe('enable');
  });

  it('si el navegador sí quedó suscrito pero guardar falla, refleja subscribed (P-06/P-07)', async () => {
    const subscription = createSubscription();
    const client = createClient({
      subscribe: vi.fn(async () => subscription),
      getSubscription: vi.fn(async () => lookupOf(subscription)),
    });
    const store = createStore({
      save: vi.fn(async () => {
        throw new Error('sin red');
      }),
    });

    const { result } = renderHook(() =>
      usePushNotifications({ vapidPublicKey: VAPID_KEY, client, store }),
    );

    let outcome = true;
    await act(async () => {
      outcome = await result.current.enable();
    });

    expect(outcome).toBe(false);
    expect(result.current.status).toBe('subscribed');
    expect(result.current.errorAction).toBe('enable');
  });

  it('si desactivar falla, re-comprueba y deja errorAction disable (P-06/P-07)', async () => {
    const subscription = createSubscription();
    const client = createClient({
      getSubscription: vi.fn(async () => lookupOf(subscription)),
      unsubscribe: vi.fn(async () => {
        throw new Error('bloqueado');
      }),
    });

    const { result } = renderHook(() =>
      usePushNotifications({ vapidPublicKey: VAPID_KEY, client, store: createStore() }),
    );

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
    const store = createStore();
    const { result } = renderHook(() =>
      usePushNotifications({ vapidPublicKey: VAPID_KEY, client: createClient(), store }),
    );

    let outcome = false;
    await act(async () => {
      outcome = await result.current.sendTest();
    });

    expect(outcome).toBe(true);
    expect(store.sendTest).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('disabled');
  });
});
