import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { createSupabaseSyncAdapter } from './supabase-sync.adapter';

const T1 = '2026-10-05T10:00:00.000Z';

interface RecordedCall {
  table: string;
  method: 'upsert' | 'delete';
  args: unknown[];
}

interface PostgrestErrorLike {
  message: string;
}

interface FakeSession {
  user: { id: string };
}

interface RealtimeHandler {
  event: string;
  filter: unknown;
  callback: (payload: unknown) => void;
}

interface FakeChannel {
  name: string;
  handlers: RealtimeHandler[];
  on(event: string, filter: unknown, callback: (payload: unknown) => void): FakeChannel;
  subscribe(): FakeChannel;
}

type AuthChangeHandler = (event: string, session: FakeSession | null) => void;

function createFakeClient(
  error: PostgrestErrorLike | null = null,
  pullRows: unknown[] = [],
) {
  const calls: RecordedCall[] = [];
  const authHandlers: AuthChangeHandler[] = [];
  const channels: FakeChannel[] = [];
  const removeChannel = vi.fn(async () => 'ok');
  let session: FakeSession | null = { user: { id: 'user-1' } };

  const client = {
    auth: {
      getSession: async () => ({
        data: { session },
        error: null,
      }),
      signInAnonymously: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
      onAuthStateChange: (handler: AuthChangeHandler) => {
        authHandlers.push(handler);
        return { data: { subscription: { unsubscribe: () => undefined } } };
      },
    },
    from(table: string) {
      const chain = {
        eq: () => chain,
        gt: () => chain,
        order: async () => ({ data: pullRows, error }),
      };

      return {
        select: () => chain,
        upsert: (rows: unknown, options: unknown) => {
          calls.push({ table, method: 'upsert', args: [rows, options] });
          return Promise.resolve({ data: null, error });
        },
        delete: () => ({
          eq: (column: string, value: unknown) => {
            calls.push({ table, method: 'delete', args: [column, value] });
            return Promise.resolve({ data: null, error });
          },
        }),
      };
    },
    channel(name: string): FakeChannel {
      const channel: FakeChannel = {
        name,
        handlers: [],
        on(event, filter, callback) {
          channel.handlers.push({ event, filter, callback });
          return channel;
        },
        subscribe() {
          return channel;
        },
      };
      channels.push(channel);
      return channel;
    },
    removeChannel,
  };

  return {
    client: client as unknown as SupabaseClient,
    calls,
    channels,
    removeChannel,
    emitAuthChange(next: FakeSession | null) {
      session = next;
      for (const handler of authHandlers) {
        handler('SIGNED_IN', next);
      }
    },
  };
}

describe('supabase sync adapter · telemetría', () => {
  it('mapea el evento a usage_events e inserta idempotente por id', async () => {
    const { client, calls } = createFakeClient();
    const adapter = createSupabaseSyncAdapter(client);

    await adapter.pushEvents([
      {
        id: 'event-1',
        eventType: 'search',
        occurredAt: T1,
        timezone: 'America/Bogota',
        country: 'CO',
        appVersion: '1.0.0',
        payload: { query: 'girls', results: 3 },
      },
    ]);

    expect(calls).toEqual([
      {
        table: 'usage_events',
        method: 'upsert',
        args: [
          [
            {
              id: 'event-1',
              user_id: 'user-1',
              event_type: 'search',
              occurred_at: T1,
              timezone: 'America/Bogota',
              country: 'CO',
              app_version: '1.0.0',
              payload: { query: 'girls', results: 3 },
            },
          ],
          { onConflict: 'id', ignoreDuplicates: true },
        ],
      },
    ]);
  });

  it('rellena con null los campos opcionales ausentes', async () => {
    const { client, calls } = createFakeClient();
    const adapter = createSupabaseSyncAdapter(client);

    await adapter.pushEvents([{ id: 'event-2', eventType: 'session_start', occurredAt: T1 }]);

    expect(calls[0]?.args[0]).toEqual([
      expect.objectContaining({
        id: 'event-2',
        timezone: null,
        country: null,
        app_version: null,
        payload: null,
      }),
    ]);
  });

  it('no toca la red cuando no hay eventos que empujar', async () => {
    const { client, calls } = createFakeClient();
    const adapter = createSupabaseSyncAdapter(client);

    await adapter.pushEvents([]);

    expect(calls).toEqual([]);
  });

  it('borra las filas propias de usage_events (derecho al olvido)', async () => {
    const { client, calls } = createFakeClient();
    const adapter = createSupabaseSyncAdapter(client);

    await adapter.clearRemoteEvents();

    expect(calls).toEqual([
      { table: 'usage_events', method: 'delete', args: ['user_id', 'user-1'] },
    ]);
  });

  it('propaga el error de Supabase con contexto', async () => {
    const { client } = createFakeClient({ message: 'permiso denegado' });
    const adapter = createSupabaseSyncAdapter(client);

    await expect(
      adapter.pushEvents([{ id: 'event-3', eventType: 'session_start', occurredAt: T1 }]),
    ).rejects.toThrow('No se pudo subir la telemetría: permiso denegado');
  });
});

describe('supabase sync adapter · favoritos', () => {
  it('valida las filas del pull y omite las inválidas (R-04)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { client } = createFakeClient(null, [
      {
        show_id: 1,
        snapshot: { name: 'Buena', genres: ['Drama'], rating: 8.1 },
        added_at: T1,
        updated_at: T1,
        deleted_at: null,
      },
      { show_id: 'roto', snapshot: null, added_at: T1, updated_at: T1 },
      {
        show_id: 2,
        snapshot: { name: 42, genres: 'no-es-array' },
        added_at: T1,
        updated_at: T1,
      },
    ]);
    const adapter = createSupabaseSyncAdapter(client);

    const favorites = await adapter.pullFavorites(T1);

    expect(favorites).toEqual([
      {
        showId: 1,
        snapshot: {
          name: 'Buena',
          genres: ['Drama'],
          imageMedium: undefined,
          premiered: undefined,
          rating: 8.1,
        },
        addedAt: T1,
        updatedAt: T1,
        deletedAt: undefined,
      },
    ]);
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('revalida el userId cacheado cuando cambia la sesión (R-14)', async () => {
    const { client, emitAuthChange } = createFakeClient();
    const adapter = createSupabaseSyncAdapter(client);

    expect(await adapter.ensureSession()).toBe('user-1');

    emitAuthChange({ user: { id: 'user-2' } });
    expect(await adapter.ensureSession()).toBe('user-2');

    emitAuthChange(null);
    expect(await adapter.ensureSession()).toBe('user-1');
  });
});

describe('supabase sync adapter · Realtime de favoritos', () => {
  it('abre un canal filtrado por usuario y reenvía las filas válidas', () => {
    const { client, channels } = createFakeClient();
    const adapter = createSupabaseSyncAdapter(client);
    const onRow = vi.fn();

    adapter.subscribeFavorites?.('user-1', onRow);

    expect(channels).toHaveLength(1);
    expect(channels[0]?.name).toBe('favorites:user-1');
    expect(channels[0]?.handlers[0]).toMatchObject({
      event: 'postgres_changes',
      filter: { event: '*', schema: 'public', table: 'favorites', filter: 'user_id=eq.user-1' },
    });

    channels[0]?.handlers[0]?.callback({
      eventType: 'UPDATE',
      new: {
        show_id: 5,
        snapshot: { name: 'Nueva', genres: ['Drama'], rating: 8 },
        added_at: T1,
        updated_at: T1,
        deleted_at: null,
      },
    });

    expect(onRow).toHaveBeenCalledWith({
      showId: 5,
      snapshot: {
        name: 'Nueva',
        genres: ['Drama'],
        imageMedium: undefined,
        premiered: undefined,
        rating: 8,
      },
      addedAt: T1,
      updatedAt: T1,
      deletedAt: undefined,
    });
  });

  it('omite filas inválidas y eventos DELETE sin snapshot', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { client, channels } = createFakeClient();
    const adapter = createSupabaseSyncAdapter(client);
    const onRow = vi.fn();

    adapter.subscribeFavorites?.('user-1', onRow);
    const callback = channels[0]?.handlers[0]?.callback;

    callback?.({ eventType: 'UPDATE', new: { show_id: 'roto' } });
    callback?.({ eventType: 'DELETE', new: {}, old: { show_id: 5 } });

    expect(onRow).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('la función devuelta por subscribe y unsubscribeFavorites quitan el canal', async () => {
    const { client, removeChannel } = createFakeClient();
    const adapter = createSupabaseSyncAdapter(client);

    const dispose = adapter.subscribeFavorites?.('user-1', vi.fn());
    dispose?.();
    expect(removeChannel).toHaveBeenCalledTimes(1);

    adapter.subscribeFavorites?.('user-1', vi.fn());
    adapter.unsubscribeFavorites?.();
    expect(removeChannel).toHaveBeenCalledTimes(2);
  });

  it('una suscripción nueva reemplaza la anterior', () => {
    const { client, removeChannel } = createFakeClient();
    const adapter = createSupabaseSyncAdapter(client);

    adapter.subscribeFavorites?.('user-1', vi.fn());
    adapter.subscribeFavorites?.('user-1', vi.fn());

    expect(removeChannel).toHaveBeenCalledTimes(1);
  });
});
