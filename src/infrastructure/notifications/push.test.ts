import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getPushSubscription,
  isPushSupported,
  PushError,
  serializePushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  urlBase64ToUint8Array,
  type PushClientDeps,
  type PushPermissionState,
  type PushSubscriptionLike,
} from './push';

/** Clave pública VAPID de prueba (base64 URL-safe, curva P-256). */
const VAPID_PUBLIC_KEY =
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

function createFakeSubscription(): PushSubscriptionLike {
  return {
    endpoint: 'https://push.example/epix-1',
    toJSON: () => ({
      endpoint: 'https://push.example/epix-1',
      keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
    }),
    unsubscribe: vi.fn(async () => true),
  };
}

function createFakeDeps(overrides: Partial<PushClientDeps> = {}): {
  deps: PushClientDeps;
  pushManager: {
    getSubscription: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
  };
  subscription: PushSubscriptionLike;
} {
  const subscription = createFakeSubscription();
  const pushManager = {
    getSubscription: vi.fn(async () => null as PushSubscriptionLike | null),
    subscribe: vi.fn(async () => subscription),
  };

  return {
    subscription,
    pushManager,
    deps: {
      isSupported: () => true,
      getRegistration: async () => ({ pushManager }),
      getPermission: () => 'granted',
      requestPermission: vi.fn(async (): Promise<PushPermissionState> => 'granted'),
      ...overrides,
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('isPushSupported', () => {
  it('sin Push API en el entorno devuelve false', () => {
    expect(isPushSupported()).toBe(false);
  });

  it('con Notification, PushManager y serviceWorker devuelve true', () => {
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn() });
    vi.stubGlobal('PushManager', class PushManager {});
    vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve({}) } });

    expect(isPushSupported()).toBe(true);
  });

  it('respeta el doble inyectado', () => {
    expect(isPushSupported({ isSupported: () => true })).toBe(true);
    expect(isPushSupported({ isSupported: () => false })).toBe(false);
  });
});

describe('urlBase64ToUint8Array', () => {
  it('decodifica base64 estándar', () => {
    expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3]);
  });

  it('acepta el alfabeto URL-safe y añade el padding que falte', () => {
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([0xfb, 0xff]);
  });
});

describe('subscribeToPush', () => {
  it('suscribe con userVisibleOnly y la clave VAPID convertida a bytes', async () => {
    const { deps, pushManager, subscription } = createFakeDeps();

    const result = await subscribeToPush(VAPID_PUBLIC_KEY, deps);

    expect(result).toBe(subscription);
    expect(pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  });

  it('pide permiso cuando está pendiente y continúa si se concede', async () => {
    const requestPermission = vi.fn(async () => 'granted' as const);
    const { deps, pushManager } = createFakeDeps({
      getPermission: () => 'default',
      requestPermission,
    });

    await subscribeToPush(VAPID_PUBLIC_KEY, deps);

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
  });

  it('lanza permission-denied si el navegador ya bloqueó las notificaciones', async () => {
    const requestPermission = vi.fn(async () => 'granted' as const);
    const { deps } = createFakeDeps({ getPermission: () => 'denied', requestPermission });

    await expect(subscribeToPush(VAPID_PUBLIC_KEY, deps)).rejects.toMatchObject({
      code: 'permission-denied',
    });
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('lanza permission-denied si el usuario no concede el permiso', async () => {
    const { deps } = createFakeDeps({
      getPermission: () => 'default',
      requestPermission: vi.fn(async () => 'denied' as const),
    });

    await expect(subscribeToPush(VAPID_PUBLIC_KEY, deps)).rejects.toBeInstanceOf(PushError);
  });

  it('lanza invalid-key sin clave VAPID', async () => {
    const { deps, pushManager } = createFakeDeps();

    await expect(subscribeToPush('   ', deps)).rejects.toMatchObject({ code: 'invalid-key' });
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('lanza unsupported cuando no hay soporte', async () => {
    const { deps } = createFakeDeps({ isSupported: () => false });

    await expect(subscribeToPush(VAPID_PUBLIC_KEY, deps)).rejects.toMatchObject({
      code: 'unsupported',
    });
  });

  it('lanza unsupported cuando no hay service worker activo', async () => {
    const { deps } = createFakeDeps({ getRegistration: null });

    await expect(subscribeToPush(VAPID_PUBLIC_KEY, deps)).rejects.toMatchObject({
      code: 'unsupported',
    });
  });

  it('envuelve el rechazo del navegador en un PushError subscribe', async () => {
    const { deps, pushManager } = createFakeDeps();
    pushManager.subscribe.mockRejectedValueOnce(new Error('NotAllowedError'));

    await expect(subscribeToPush(VAPID_PUBLIC_KEY, deps)).rejects.toMatchObject({
      code: 'subscribe',
      message: 'NotAllowedError',
    });
  });
});

describe('getPushSubscription', () => {
  it('devuelve null sin soporte', async () => {
    expect(await getPushSubscription({ isSupported: () => false })).toBeNull();
  });

  it('devuelve la suscripción activa', async () => {
    const { deps, pushManager, subscription } = createFakeDeps();
    pushManager.getSubscription.mockResolvedValueOnce(subscription);

    expect(await getPushSubscription(deps)).toBe(subscription);
  });

  it('devuelve null si el pushManager falla', async () => {
    const { deps, pushManager } = createFakeDeps();
    pushManager.getSubscription.mockRejectedValueOnce(new Error('boom'));

    expect(await getPushSubscription(deps)).toBeNull();
  });
});

describe('unsubscribeFromPush', () => {
  it('cancela la suscripción y devuelve true', async () => {
    const { deps, pushManager, subscription } = createFakeDeps();
    pushManager.getSubscription.mockResolvedValueOnce(subscription);

    expect(await unsubscribeFromPush(deps)).toBe(true);
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('devuelve false cuando no había suscripción', async () => {
    const { deps } = createFakeDeps();

    expect(await unsubscribeFromPush(deps)).toBe(false);
  });

  it('lanza PushError unsubscribe si el navegador rechaza', async () => {
    const { deps, pushManager, subscription } = createFakeDeps();
    pushManager.getSubscription.mockResolvedValueOnce(subscription);
    vi.mocked(subscription.unsubscribe).mockRejectedValueOnce(new Error('network'));

    await expect(unsubscribeFromPush(deps)).rejects.toMatchObject({ code: 'unsubscribe' });
  });
});

describe('serializePushSubscription', () => {
  it('extrae endpoint y claves del toJSON', () => {
    expect(serializePushSubscription(createFakeSubscription())).toEqual({
      endpoint: 'https://push.example/epix-1',
      p256dh: 'p256dh-key',
      auth: 'auth-key',
    });
  });

  it('devuelve null si el payload no trae claves', () => {
    const subscription: PushSubscriptionLike = {
      endpoint: 'https://push.example/epix-2',
      toJSON: () => ({ endpoint: 'https://push.example/epix-2' }),
      unsubscribe: async () => true,
    };

    expect(serializePushSubscription(subscription)).toBeNull();
  });

  it('devuelve null si toJSON lanza', () => {
    const subscription: PushSubscriptionLike = {
      endpoint: 'https://push.example/epix-3',
      toJSON: () => {
        throw new Error('boom');
      },
      unsubscribe: async () => true,
    };

    expect(serializePushSubscription(subscription)).toBeNull();
  });
});
