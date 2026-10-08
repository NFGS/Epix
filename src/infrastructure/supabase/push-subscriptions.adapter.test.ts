import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import {
  deletePushSubscription,
  listMySubscriptions,
  PushSubscriptionsError,
  savePushSubscription,
  sendTestPush,
} from './push-subscriptions.adapter';

const SUPABASE_ENV = { url: 'https://epix.supabase.co', anonKey: 'anon-key' };
const SESSION = {
  access_token: 'jwt-de-prueba',
  user: { id: 'user-1' },
};

interface RecordedCall {
  table: string;
  method: 'upsert' | 'delete' | 'select';
  args: unknown[];
}

interface FakeClientOptions {
  session?: typeof SESSION | null;
  rows?: unknown[];
  error?: { message: string } | null;
}

function createFakeClient(options: FakeClientOptions = {}) {
  const calls: RecordedCall[] = [];
  const error = options.error ?? null;
  const session = options.session === undefined ? SESSION : options.session;

  const client = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session }, error: null })),
      signInAnonymously: vi.fn(async () => ({ data: { user: { id: 'anon-user' } }, error: null })),
    },
    from(table: string) {
      return {
        upsert: (row: unknown, upsertOptions: unknown) => {
          calls.push({ table, method: 'upsert', args: [row, upsertOptions] });
          return Promise.resolve({ data: null, error });
        },
        delete: () => ({
          eq: (column: string, value: unknown) => {
            calls.push({ table, method: 'delete', args: [column, value] });
            return Promise.resolve({ data: null, error });
          },
        }),
        select: (columns: string) => ({
          eq: (column: string, value: unknown) => {
            calls.push({ table, method: 'select', args: [columns, column, value] });
            return Promise.resolve({ data: options.rows ?? [], error });
          },
        }),
      };
    },
  };

  return { client: client as unknown as SupabaseClient, calls };
}

const subscription = {
  endpoint: 'https://push.example/epix-1',
  p256dh: 'p256dh-key',
  auth: 'auth-key',
};

describe('push subscriptions adapter · guardar', () => {
  it('hace upsert por endpoint con el user_id de la sesión', async () => {
    const { client, calls } = createFakeClient();

    await savePushSubscription(subscription, { client });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      table: 'push_subscriptions',
      method: 'upsert',
      args: [
        { user_id: 'user-1', ...subscription },
        { onConflict: 'endpoint' },
      ],
    });
  });

  it('crea sesión anónima si no hay sesión activa', async () => {
    const { client, calls } = createFakeClient({ session: null });

    await savePushSubscription(subscription, { client });

    expect(calls[0].args[0]).toMatchObject({ user_id: 'anon-user' });
  });

  it('lanza unconfigured sin Supabase configurado', async () => {
    await expect(savePushSubscription(subscription, { client: null })).rejects.toMatchObject({
      code: 'unconfigured',
    });
  });

  it('propaga el error de PostgREST como save', async () => {
    const { client } = createFakeClient({ error: { message: 'RLS denegó el insert' } });

    await expect(savePushSubscription(subscription, { client })).rejects.toMatchObject({
      code: 'save',
    });
  });
});

describe('push subscriptions adapter · borrar', () => {
  it('borra por endpoint (RLS limita al dueño)', async () => {
    const { client, calls } = createFakeClient();

    await deletePushSubscription(subscription.endpoint, { client });

    expect(calls[0]).toEqual({
      table: 'push_subscriptions',
      method: 'delete',
      args: ['endpoint', subscription.endpoint],
    });
  });

  it('propaga el error como delete', async () => {
    const { client } = createFakeClient({ error: { message: 'boom' } });

    await expect(deletePushSubscription(subscription.endpoint, { client })).rejects.toBeInstanceOf(
      PushSubscriptionsError,
    );
  });
});

describe('push subscriptions adapter · listar', () => {
  it('mapea las filas válidas y omite las corruptas', async () => {
    const { client, calls } = createFakeClient({
      rows: [
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
          created_at: '2026-10-07T10:00:00.000Z',
        },
        { endpoint: '', p256dh: 'x', auth: 'y', created_at: '2026-10-07T10:00:00.000Z' },
      ],
    });

    const records = await listMySubscriptions({ client });

    expect(records).toEqual([{ ...subscription, createdAt: '2026-10-07T10:00:00.000Z' }]);
    expect(calls[0].args).toEqual([
      'endpoint, p256dh, auth, created_at',
      'user_id',
      'user-1',
    ]);
  });

  it('propaga el error como list', async () => {
    const { client } = createFakeClient({ error: { message: 'boom' } });

    await expect(listMySubscriptions({ client })).rejects.toMatchObject({ code: 'list' });
  });
});

describe('push subscriptions adapter · push de prueba', () => {
  it('invoca epix-push con el JWT de la sesión y { test: true }', async () => {
    const { client } = createFakeClient();
    const fetchFn = vi.fn(async () => new Response('{}', { status: 200 }));

    await sendTestPush({ client, env: SUPABASE_ENV, fetchFn });

    expect(fetchFn).toHaveBeenCalledWith('https://epix.supabase.co/functions/v1/epix-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-de-prueba',
        apikey: 'anon-key',
      },
      body: JSON.stringify({ test: true }),
    });
  });

  it('lanza test si la función responde con error', async () => {
    const { client } = createFakeClient();
    const fetchFn = vi.fn(async () => new Response('{}', { status: 502 }));

    await expect(sendTestPush({ client, env: SUPABASE_ENV, fetchFn })).rejects.toMatchObject({
      code: 'test',
    });
  });

  it('lanza session sin sesión activa', async () => {
    const { client } = createFakeClient({ session: null });
    const fetchFn = vi.fn(async () => new Response('{}', { status: 200 }));

    await expect(sendTestPush({ client, env: SUPABASE_ENV, fetchFn })).rejects.toMatchObject({
      code: 'session',
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('lanza test si fetch falla', async () => {
    const { client } = createFakeClient();
    const fetchFn = vi.fn(async () => {
      throw new Error('offline');
    });

    await expect(sendTestPush({ client, env: SUPABASE_ENV, fetchFn })).rejects.toMatchObject({
      code: 'test',
    });
  });
});
