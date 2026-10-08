import { describe, expect, it, vi } from 'vitest';

import type { PushSubscriptionLike, PushSubscriptionLookup } from './push';
import { releasePushOnSignOut } from './push-session';

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

function subscriptionLookup(subscription: PushSubscriptionLike): PushSubscriptionLookup {
  return { status: 'subscription', subscription };
}

describe('releasePushOnSignOut (E-05)', () => {
  it('sin suscripción activa no toca nada', async () => {
    const removeRemote = vi.fn(async () => undefined);

    await releasePushOnSignOut({
      getSubscription: async () => ({ status: 'none' }),
      removeRemote,
    });

    expect(removeRemote).not.toHaveBeenCalled();
  });

  it('con fallo de consulta no lanza ni borra', async () => {
    const removeRemote = vi.fn(async () => undefined);

    await releasePushOnSignOut({
      getSubscription: async () => {
        throw new Error('sin service worker');
      },
      removeRemote,
    });

    expect(removeRemote).not.toHaveBeenCalled();
  });

  it('borra la fila remota y desuscribe el navegador', async () => {
    const subscription = createSubscription();
    const removeRemote = vi.fn(async () => undefined);

    await releasePushOnSignOut({
      getSubscription: async () => subscriptionLookup(subscription),
      removeRemote,
    });

    expect(removeRemote).toHaveBeenCalledWith('https://push.example/epix-1');
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('usa el endpoint directo si `toJSON` falla', async () => {
    const subscription: PushSubscriptionLike = {
      endpoint: 'https://push.example/epix-2',
      toJSON: () => {
        throw new Error('boom');
      },
      unsubscribe: vi.fn(async () => true),
    };
    const removeRemote = vi.fn(async () => undefined);

    await releasePushOnSignOut({
      getSubscription: async () => subscriptionLookup(subscription),
      removeRemote,
    });

    expect(removeRemote).toHaveBeenCalledWith('https://push.example/epix-2');
  });

  it('si el borrado remoto falla, igual desuscribe sin lanzar', async () => {
    const subscription = createSubscription();

    await expect(
      releasePushOnSignOut({
        getSubscription: async () => subscriptionLookup(subscription),
        removeRemote: async () => {
          throw new Error('sin red');
        },
      }),
    ).resolves.toBeUndefined();

    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('si el navegador rechaza el unsubscribe, no lanza', async () => {
    const subscription = createSubscription();
    vi.mocked(subscription.unsubscribe).mockRejectedValueOnce(new Error('bloqueado'));

    await expect(
      releasePushOnSignOut({
        getSubscription: async () => subscriptionLookup(subscription),
        removeRemote: async () => undefined,
      }),
    ).resolves.toBeUndefined();
  });
});
