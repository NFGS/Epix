-- Epix — Migración 004: suscripciones Web Push (VAPID)
-- ────────────────────────────────────────────────────────────────
-- QUÉ HACE
--   Crea `public.push_subscriptions`: una fila por dispositivo/navegador
--   suscrito a notificaciones push (Push API + VAPID). El cliente guarda aquí
--   el endpoint y las claves que devuelve `pushManager.subscribe`; la Edge
--   Function `epix-push` las lee (service_role) para enviar avisos.
--
-- ANTES DE EJECUTAR
--   1. Ejecuta este archivo completo en el SQL Editor de Supabase.
--      Es IDEMPOTENTE: puede re-ejecutarse sin error (`if not exists` +
--      `drop policy if exists`).
--   2. No requiere extensiones: `gen_random_uuid()` viene en PostgreSQL 13+
--      (proyectos de Supabase ya lo tienen disponible).
--   3. RLS estricto: cada usuario solo ve/gestiona SUS suscripciones
--      (`(select auth.uid()) = user_id`, mismo patrón con initplan que 003).
--      La Edge Function usa la service_role, que salta RLS para el envío.
--
-- NOTA: `endpoint` es único globalmente. Un upsert con `onConflict: endpoint`
-- reasigna la suscripción al usuario que la posee en este momento (p. ej.
-- tras iniciar sesión con la misma cuenta en otro dispositivo).

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own on public.push_subscriptions
  for select using ((select auth.uid()) = user_id);

drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists push_subscriptions_update_own on public.push_subscriptions;
create policy push_subscriptions_update_own on public.push_subscriptions
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete using ((select auth.uid()) = user_id);
