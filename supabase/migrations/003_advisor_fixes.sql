-- Epix — Migración 003: mejoras de rendimiento, retención y advisors
-- ─────────────────────────────────────────────────────────────────────
-- 1) Índices para claves foráneas (advisor: unindexed_foreign_keys)
-- 2) Políticas RLS con `(select auth.uid())` (advisor: auth_rls_initplan):
--    la función se evalúa una vez por consulta (initplan) en lugar de una vez
--    por fila. Mismos criterios que la migración 001, solo optimizados.
-- 3) Función de retención de datos (`purge_epix_data`): purga tombstones de
--    favoritos, eventos de uso e historial más antiguos que N días (180 por
--    defecto). Pensada para ejecutarse manualmente o con pg_cron (ver guía).
-- Idempotente: puede re-ejecutarse sin efectos secundarios.

-- 1) Índices de claves foráneas -------------------------------------------------
create index if not exists usage_events_user_id_idx on public.usage_events (user_id);
create index if not exists watch_history_user_id_idx on public.watch_history (user_id);

-- 2) Políticas RLS con initplan ------------------------------------------------
-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using ((select auth.uid()) = user_id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert with check ((select auth.uid()) = user_id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles for delete using ((select auth.uid()) = user_id);

-- preferences
drop policy if exists preferences_select_own on public.preferences;
create policy preferences_select_own on public.preferences for select using ((select auth.uid()) = user_id);
drop policy if exists preferences_insert_own on public.preferences;
create policy preferences_insert_own on public.preferences for insert with check ((select auth.uid()) = user_id);
drop policy if exists preferences_update_own on public.preferences;
create policy preferences_update_own on public.preferences for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists preferences_delete_own on public.preferences;
create policy preferences_delete_own on public.preferences for delete using ((select auth.uid()) = user_id);

-- favorites
drop policy if exists favorites_select_own on public.favorites;
create policy favorites_select_own on public.favorites for select using ((select auth.uid()) = user_id);
drop policy if exists favorites_insert_own on public.favorites;
create policy favorites_insert_own on public.favorites for insert with check ((select auth.uid()) = user_id);
drop policy if exists favorites_update_own on public.favorites;
create policy favorites_update_own on public.favorites for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists favorites_delete_own on public.favorites;
create policy favorites_delete_own on public.favorites for delete using ((select auth.uid()) = user_id);

-- watch_history
drop policy if exists watch_history_select_own on public.watch_history;
create policy watch_history_select_own on public.watch_history for select using ((select auth.uid()) = user_id);
drop policy if exists watch_history_insert_own on public.watch_history;
create policy watch_history_insert_own on public.watch_history for insert with check ((select auth.uid()) = user_id);
drop policy if exists watch_history_update_own on public.watch_history;
create policy watch_history_update_own on public.watch_history for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists watch_history_delete_own on public.watch_history;
create policy watch_history_delete_own on public.watch_history for delete using ((select auth.uid()) = user_id);

-- usage_events
drop policy if exists usage_events_select_own on public.usage_events;
create policy usage_events_select_own on public.usage_events for select using ((select auth.uid()) = user_id);
drop policy if exists usage_events_insert_own on public.usage_events;
create policy usage_events_insert_own on public.usage_events for insert with check ((select auth.uid()) = user_id);
drop policy if exists usage_events_update_own on public.usage_events;
create policy usage_events_update_own on public.usage_events for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists usage_events_delete_own on public.usage_events;
create policy usage_events_delete_own on public.usage_events for delete using ((select auth.uid()) = user_id);

-- sync_cursors
drop policy if exists sync_cursors_select_own on public.sync_cursors;
create policy sync_cursors_select_own on public.sync_cursors for select using ((select auth.uid()) = user_id);
drop policy if exists sync_cursors_insert_own on public.sync_cursors;
create policy sync_cursors_insert_own on public.sync_cursors for insert with check ((select auth.uid()) = user_id);
drop policy if exists sync_cursors_update_own on public.sync_cursors;
create policy sync_cursors_update_own on public.sync_cursors for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists sync_cursors_delete_own on public.sync_cursors;
create policy sync_cursors_delete_own on public.sync_cursors for delete using ((select auth.uid()) = user_id);

-- 3) Retención de datos ----------------------------------------------------------
create or replace function public.purge_epix_data(retention_days int default 180)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  favorites_purged int;
  events_purged int;
  history_purged int;
begin
  with deleted as (
    delete from public.favorites
    where deleted_at is not null
      and deleted_at < now() - make_interval(days => retention_days)
    returning 1
  )
  select count(*) into favorites_purged from deleted;

  with deleted as (
    delete from public.usage_events
    where occurred_at < now() - make_interval(days => retention_days)
    returning 1
  )
  select count(*) into events_purged from deleted;

  with deleted as (
    delete from public.watch_history
    where occurred_at < now() - make_interval(days => retention_days)
    returning 1
  )
  select count(*) into history_purged from deleted;

  return jsonb_build_object(
    'favorites_tombstones', favorites_purged,
    'usage_events', events_purged,
    'watch_history', history_purged
  );
end;
$$;

comment on function public.purge_epix_data(int) is
  'Purga datos antiguos de Epix según política de retención (por defecto 180 días). Ejecutar manualmente o programar con pg_cron: select cron.schedule(''epix-purge'', ''0 4 * * *'', $$select public.purge_epix_data(180)$$);';

-- Solo el propietario (service_role/postgres) puede ejecutarla; nunca el cliente.
revoke all on function public.purge_epix_data(int) from public;
revoke all on function public.purge_epix_data(int) from anon;
revoke all on function public.purge_epix_data(int) from authenticated;
