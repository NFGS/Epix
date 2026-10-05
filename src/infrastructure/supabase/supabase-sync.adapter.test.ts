import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

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

function createFakeClient(error: PostgrestErrorLike | null = null) {
  const calls: RecordedCall[] = [];

  const client = {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: 'user-1' } } },
        error: null,
      }),
      signInAnonymously: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from(table: string) {
      return {
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
  };

  return { client: client as unknown as SupabaseClient, calls };
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
