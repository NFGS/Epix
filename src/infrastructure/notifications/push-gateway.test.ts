import { describe, expect, it, vi } from 'vitest';

import { PushError } from '@/application/ports/push-gateway';

import type { PushSubscriptionLike, PushSubscriptionLookup } from './push';
import {
  createPushGateway,
  type PushCloudStore,
  type PushSessionControl,
  type PushWebClient,
} from './push-gateway';

function createSubscription(endpoint = 'https://push.example/epix-1'): PushSubscriptionLike {
  return {
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh: 'p256dh-key', auth: 'auth-key' } }),
    unsubscribe: vi.fn(async () => true),
  };
}

function lookupOf(subscription: PushSubscriptionLike | null): PushSubscriptionLookup {
  return subscription === null ? { status: 'none' } : { status: 'subscription', subscription };
}

function createPushModule(overrides: Partial<PushWebClient> = {}): PushWebClient {
  return {
    subscribeToPush: vi.fn(async () => createSubscription()),
    getPushSubscription: vi.fn(async (): Promise<PushSubscriptionLookup> => ({ status: 'none' })),
    serializePushSubscription: (subscription) => ({
      endpoint: subscription.endpoint,
      p256dh: 'p256dh-key',
      auth: 'auth-key',
    }),
    ...overrides,
  };
}

function createAdapterModule(overrides: Partial<PushCloudStore> = {}): PushCloudStore {
  return {
    savePushSubscription: vi.fn(async () => undefined),
    deletePushSubscription: vi.fn(async () => undefined),
    sendTestPush: vi.fn(async () => undefined),
    ...overrides,
  };
}

function createSessionModule(overrides: Partial<PushSessionControl> = {}): PushSessionControl {
  return {
    releasePushOnSignOut: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('createPushGateway', () => {
  it('isSupported delega en la detección inyectada', () => {
    const gateway = createPushGateway({ supportsPush: () => true });
    expect(gateway.isSupported()).toBe(true);

    const unsupported = createPushGateway({ supportsPush: () => false });
    expect(unsupported.isSupported()).toBe(false);
  });

  it('getState devuelve none sin suscripción', async () => {
    const gateway = createPushGateway({
      loadPush: async () => createPushModule(),
    });

    await expect(gateway.getState()).resolves.toEqual({ status: 'none' });
  });

  it('getState propaga el código de error de la consulta', async () => {
    const pushModule = createPushModule({
      getPushSubscription: vi.fn(async (): Promise<PushSubscriptionLookup> => ({
        status: 'error',
        error: new PushError('query', 'pushManager roto'),
      })),
    });
    const gateway = createPushGateway({ loadPush: async () => pushModule });

    await expect(gateway.getState()).resolves.toEqual({ status: 'error', code: 'query' });
  });

  it('getState devuelve el endpoint serializado', async () => {
    const pushModule = createPushModule({
      getPushSubscription: vi.fn(async () => lookupOf(createSubscription())),
    });
    const gateway = createPushGateway({ loadPush: async () => pushModule });

    await expect(gateway.getState()).resolves.toEqual({
      status: 'subscribed',
      endpoint: 'https://push.example/epix-1',
    });
  });

  it('getState usa el endpoint directo si no se puede serializar', async () => {
    const pushModule = createPushModule({
      getPushSubscription: vi.fn(async () => lookupOf(createSubscription('https://push.example/2'))),
      serializePushSubscription: () => null,
    });
    const gateway = createPushGateway({ loadPush: async () => pushModule });

    await expect(gateway.getState()).resolves.toEqual({
      status: 'subscribed',
      endpoint: 'https://push.example/2',
    });
  });

  it('subscribe suscribe el navegador y guarda en la nube', async () => {
    const subscription = createSubscription();
    const pushModule = createPushModule({
      subscribeToPush: vi.fn(async () => subscription),
    });
    const adapter = createAdapterModule();
    const gateway = createPushGateway({
      loadPush: async () => pushModule,
      loadAdapter: async () => adapter,
    });

    await expect(gateway.subscribe('clave-vapid')).resolves.toEqual({
      endpoint: 'https://push.example/epix-1',
    });
    expect(pushModule.subscribeToPush).toHaveBeenCalledWith('clave-vapid');
    expect(adapter.savePushSubscription).toHaveBeenCalledWith({
      endpoint: 'https://push.example/epix-1',
      p256dh: 'p256dh-key',
      auth: 'auth-key',
    });
  });

  it('subscribe falla con código subscribe si la suscripción no es serializable', async () => {
    const pushModule = createPushModule({ serializePushSubscription: () => null });
    const adapter = createAdapterModule();
    const gateway = createPushGateway({
      loadPush: async () => pushModule,
      loadAdapter: async () => adapter,
    });

    await expect(gateway.subscribe('clave-vapid')).rejects.toMatchObject({
      name: 'PushError',
      code: 'subscribe',
    });
    expect(adapter.savePushSubscription).not.toHaveBeenCalled();
  });

  it('subscribe envuelve el fallo de la nube en PushError subscribe', async () => {
    const adapter = createAdapterModule({
      savePushSubscription: vi.fn(async () => {
        throw new Error('sin red');
      }),
    });
    const gateway = createPushGateway({
      loadPush: async () => createPushModule(),
      loadAdapter: async () => adapter,
    });

    await expect(gateway.subscribe('clave-vapid')).rejects.toMatchObject({
      name: 'PushError',
      code: 'subscribe',
      message: 'sin red',
    });
  });

  it('unsubscribe sin suscripción no consulta la nube', async () => {
    const adapter = createAdapterModule();
    const gateway = createPushGateway({
      loadPush: async () => createPushModule(),
      loadAdapter: async () => adapter,
    });

    await expect(gateway.unsubscribe()).resolves.toBeUndefined();
    expect(adapter.deletePushSubscription).not.toHaveBeenCalled();
  });

  it('unsubscribe propaga el error de consulta', async () => {
    const pushModule = createPushModule({
      getPushSubscription: vi.fn(async (): Promise<PushSubscriptionLookup> => ({
        status: 'error',
        error: new PushError('query', 'roto'),
      })),
    });
    const adapter = createAdapterModule();
    const gateway = createPushGateway({
      loadPush: async () => pushModule,
      loadAdapter: async () => adapter,
    });

    await expect(gateway.unsubscribe()).rejects.toBeInstanceOf(PushError);
    expect(adapter.deletePushSubscription).not.toHaveBeenCalled();
  });

  it('unsubscribe cancela el navegador y borra la fila con su endpoint', async () => {
    const subscription = createSubscription();
    const pushModule = createPushModule({
      getPushSubscription: vi.fn(async () => lookupOf(subscription)),
    });
    const adapter = createAdapterModule();
    const gateway = createPushGateway({
      loadPush: async () => pushModule,
      loadAdapter: async () => adapter,
    });

    await gateway.unsubscribe();

    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(adapter.deletePushSubscription).toHaveBeenCalledWith('https://push.example/epix-1');
  });

  it('unsubscribe envuelve el fallo del borrado remoto en PushError unsubscribe', async () => {
    const pushModule = createPushModule({
      getPushSubscription: vi.fn(async () => lookupOf(createSubscription())),
    });
    const adapter = createAdapterModule({
      deletePushSubscription: vi.fn(async () => {
        throw new Error('RLS');
      }),
    });
    const gateway = createPushGateway({
      loadPush: async () => pushModule,
      loadAdapter: async () => adapter,
    });

    await expect(gateway.unsubscribe()).rejects.toMatchObject({
      name: 'PushError',
      code: 'unsubscribe',
      message: 'RLS',
    });
  });

  it('release delega en la limpieza de sesión', async () => {
    const session = createSessionModule();
    const gateway = createPushGateway({ loadSession: async () => session });

    await gateway.release();

    expect(session.releasePushOnSignOut).toHaveBeenCalledTimes(1);
  });

  it('release es best-effort: nunca lanza', async () => {
    const session = createSessionModule({
      releasePushOnSignOut: vi.fn(async () => {
        throw new Error('boom');
      }),
    });
    const gateway = createPushGateway({ loadSession: async () => session });

    await expect(gateway.release()).resolves.toBeUndefined();

    const brokenLoader = createPushGateway({
      loadSession: async () => {
        throw new Error('chunk no disponible');
      },
    });

    await expect(brokenLoader.release()).resolves.toBeUndefined();
  });

  it('sendTest devuelve ok cuando la Edge Function responde', async () => {
    const adapter = createAdapterModule();
    const gateway = createPushGateway({ loadAdapter: async () => adapter });

    await expect(gateway.sendTest()).resolves.toEqual({ ok: true });
    expect(adapter.sendTestPush).toHaveBeenCalledTimes(1);
  });

  it('sendTest devuelve el error sin lanzar', async () => {
    const adapter = createAdapterModule({
      sendTestPush: vi.fn(async () => {
        throw new Error('sin sesión');
      }),
    });
    const gateway = createPushGateway({ loadAdapter: async () => adapter });

    await expect(gateway.sendTest()).resolves.toEqual({ ok: false, error: 'sin sesión' });
  });
});
