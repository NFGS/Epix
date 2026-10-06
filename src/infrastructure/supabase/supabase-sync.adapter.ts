import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import type {
  RemoteFavorite,
  RemoteHistoryEntry,
  RemoteUsageEvent,
  SyncAdapter,
} from '@/application/ports/sync-adapter';
import type { FavoriteSnapshot } from '@/domain/entities/favorite';
import type { UsageEventPayload } from '@/domain/entities/usage-event';
import { logger } from '@/shared/lib/logger';

import { getSupabaseClient } from './client';

interface FavoriteRow {
  user_id: string;
  show_id: number;
  snapshot: FavoriteSnapshot;
  added_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const favoriteSnapshotSchema = z.object({
  name: z.string(),
  genres: z.array(z.string()),
  imageMedium: z.string().nullish(),
  premiered: z.number().nullish(),
  rating: z.number().nullish(),
});

/** Valida cada fila del pull antes de tocarla: una fila corrupta se omite (R-04). */
export const favoritePullRowSchema = z.object({
  show_id: z.number().int(),
  snapshot: favoriteSnapshotSchema,
  added_at: z.string().min(1),
  updated_at: z.string().min(1),
  deleted_at: z.string().nullable().optional(),
});

interface FavoriteDeleteRow {
  show_id: number;
  snapshot: FavoriteSnapshot | null;
  added_at: string;
}

interface UsageEventRow {
  id: string;
  user_id: string;
  event_type: string;
  occurred_at: string;
  timezone: string | null;
  country: string | null;
  app_version: string | null;
  payload: UsageEventPayload | null;
}

interface AuthErrorLike {
  message: string;
}

interface PostgrestErrorLike {
  message: string;
}

function assertNoError(error: AuthErrorLike | PostgrestErrorLike | null, context: string): void {
  if (error !== null) {
    throw new Error(`${context}: ${error.message}`);
  }
}

/**
 * Adaptador de sincronización contra Supabase (auth anónima + RLS).
 * Upsert idempotente por PK `(user_id, show_id)` y tombstones `deleted_at`.
 */
export function createSupabaseSyncAdapter(client: SupabaseClient): SyncAdapter {
  let userId: string | null = null;

  // R-14: si la sesión cambia (logout, refresh, otra pestaña), el caché se invalida.
  client.auth.onAuthStateChange((_event, session) => {
    userId = session?.user.id ?? null;
  });

  async function getUserId(): Promise<string> {
    if (userId !== null) {
      return userId;
    }

    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    assertNoError(sessionError, 'No se pudo leer la sesión');

    if (sessionData.session !== null) {
      userId = sessionData.session.user.id;
      return userId;
    }

    const { data: signInData, error: signInError } = await client.auth.signInAnonymously();
    assertNoError(signInError, 'No se pudo iniciar la sesión anónima');

    if (signInData.user === null) {
      throw new Error('Supabase no devolvió un usuario anónimo.');
    }

    userId = signInData.user.id;
    return userId;
  }

  return {
    async ensureSession(): Promise<string> {
      return getUserId();
    },

    async pullFavorites(sinceIso: string): Promise<RemoteFavorite[]> {
      const uid = await getUserId();
      const { data, error } = await client
        .from('favorites')
        .select('show_id, snapshot, added_at, updated_at, deleted_at')
        .eq('user_id', uid)
        .gt('updated_at', sinceIso)
        .order('updated_at', { ascending: true });

      assertNoError(error, 'No se pudieron leer los favoritos remotos');

      const rows: unknown[] = data ?? [];
      const favorites: RemoteFavorite[] = [];

      for (const row of rows) {
        const parsed = favoritePullRowSchema.safeParse(row);

        if (!parsed.success) {
          logger.warn(
            'Epix: fila de favorito remoto omitida por datos inválidos.',
            parsed.error.message,
          );
          continue;
        }

        const { show_id, snapshot, added_at, updated_at, deleted_at } = parsed.data;

        favorites.push({
          showId: show_id,
          snapshot: {
            name: snapshot.name,
            genres: snapshot.genres,
            imageMedium: snapshot.imageMedium ?? undefined,
            premiered: snapshot.premiered ?? undefined,
            rating: snapshot.rating ?? undefined,
          },
          addedAt: added_at,
          updatedAt: updated_at,
          deletedAt: deleted_at ?? undefined,
        });
      }

      return favorites;
    },

    async upsertFavorites(favorites: RemoteFavorite[]): Promise<void> {
      if (favorites.length === 0) {
        return;
      }

      const uid = await getUserId();
      const rows: FavoriteRow[] = favorites.map((favorite) => ({
        user_id: uid,
        show_id: favorite.showId,
        snapshot: favorite.snapshot,
        added_at: favorite.addedAt,
        updated_at: favorite.updatedAt,
        deleted_at: favorite.deletedAt ?? null,
      }));

      const { error } = await client
        .from('favorites')
        .upsert(rows, { onConflict: 'user_id,show_id' });

      assertNoError(error, 'No se pudieron guardar los favoritos remotos');
    },

    async deleteFavorites(showIds: number[]): Promise<void> {
      if (showIds.length === 0) {
        return;
      }

      const uid = await getUserId();
      const nowIso = new Date().toISOString();

      const { data, error: readError } = await client
        .from('favorites')
        .select('show_id, snapshot, added_at')
        .eq('user_id', uid)
        .in('show_id', showIds);

      assertNoError(readError, 'No se pudieron leer los favoritos a borrar');

      const existing = (data ?? []) as unknown as FavoriteDeleteRow[];
      const byShowId = new Map(existing.map((row) => [row.show_id, row]));

      const rows: FavoriteRow[] = showIds.map((showId) => {
        const current = byShowId.get(showId);
        return {
          user_id: uid,
          show_id: showId,
          snapshot: current?.snapshot ?? { name: '', genres: [] },
          added_at: current?.added_at ?? nowIso,
          updated_at: nowIso,
          deleted_at: nowIso,
        };
      });

      const { error } = await client
        .from('favorites')
        .upsert(rows, { onConflict: 'user_id,show_id' });

      assertNoError(error, 'No se pudieron borrar los favoritos remotos');
    },

    async pushHistory(entries: RemoteHistoryEntry[]): Promise<void> {
      if (entries.length === 0) {
        return;
      }

      const uid = await getUserId();
      const rows = entries.map((entry) => ({
        id: entry.id,
        user_id: uid,
        show_id: entry.showId ?? null,
        event_type: entry.eventType,
        query: entry.query ?? null,
        occurred_at: entry.occurredAt,
        timezone: entry.timezone ?? null,
      }));

      const { error } = await client
        .from('watch_history')
        .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });

      assertNoError(error, 'No se pudo subir el historial');
    },

    async clearRemoteHistory(): Promise<void> {
      const uid = await getUserId();
      const { error } = await client.from('watch_history').delete().eq('user_id', uid);
      assertNoError(error, 'No se pudo limpiar el historial remoto');
    },

    async pushEvents(events: RemoteUsageEvent[]): Promise<void> {
      if (events.length === 0) {
        return;
      }

      const uid = await getUserId();
      const rows: UsageEventRow[] = events.map((event) => ({
        id: event.id,
        user_id: uid,
        event_type: event.eventType,
        occurred_at: event.occurredAt,
        timezone: event.timezone ?? null,
        country: event.country ?? null,
        app_version: event.appVersion ?? null,
        payload: event.payload ?? null,
      }));

      const { error } = await client
        .from('usage_events')
        .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });

      assertNoError(error, 'No se pudo subir la telemetría');
    },

    async clearRemoteEvents(): Promise<void> {
      const uid = await getUserId();
      const { error } = await client.from('usage_events').delete().eq('user_id', uid);
      assertNoError(error, 'No se pudo borrar la telemetría remota');
    },
  };
}

/** Crea el adaptador desde `import.meta.env`; `null` si Supabase no está configurado. */
export function createSupabaseSyncAdapterFromEnv(): SyncAdapter | null {
  const client = getSupabaseClient();
  return client === null ? null : createSupabaseSyncAdapter(client);
}
