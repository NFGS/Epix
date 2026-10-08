-- Epix — Migración 005: reclamación atómica de suscripciones push
-- ─────────────────────────────────────────────────────────────────────────
-- QUÉ HACE
--   Crea la RPC `public.claim_push_subscription`: registra (o reasigna) la
--   suscripción del navegador actual para `auth.uid()` en una sola llamada.
--
-- POR QUÉ (navegador compartido)
--   `push_subscriptions.endpoint` es único global. El flujo anterior hacía un
--   `upsert` directo desde el cliente (con `onConflict: endpoint`), pero RLS
--   impide tocar una fila que pertenece a OTRO usuario: si dos cuentas usan el
--   mismo navegador (dispositivo compartido), la segunda recibía un error de
--   RLS y quedaba sin push. Esta función `security definer` elimina la fila
--   anterior (de otro usuario) y hace upsert de la propia, de forma atómica.
--
-- TRADE-OFF DOCUMENTADO
--   Los `endpoint` de Web Push son URLs-capacidad: quien conoce una puede
--   enviar notificaciones a ese navegador. La reasignación es intencional
--   (el navegador es el que reclama), pero implica que dos cuentas del mismo
--   navegador comparten el canal: solo la última activa recibe push. Es el
--   comportamiento correcto para un dispositivo compartido y está limitado
--   por `auth.uid()` (nunca se puede reclamar para un tercero).
--
-- SEGURIDAD
--   - `security definer` + `set search_path = public` (sin secuestro de rutas).
--   - Exige sesión (`auth.uid() is not null`) y parámetros no vacíos.
--   - `execute` solo para `authenticated` (ni `anon` ni `public`).
--
-- IDEMPOTENTE: puede re-ejecutarse sin error (`create or replace` + revokes).

create or replace function public.claim_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Se requiere una sesión autenticada.'
      using errcode = '28000';
  end if;

  if p_endpoint is null or btrim(p_endpoint) = ''
     or p_p256dh is null or btrim(p_p256dh) = ''
     or p_auth is null or btrim(p_auth) = '' then
    raise exception 'Suscripción push incompleta.'
      using errcode = '22023';
  end if;

  delete from public.push_subscriptions
   where endpoint = p_endpoint
     and user_id <> v_user_id;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (v_user_id, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth;
end;
$$;

comment on function public.claim_push_subscription(text, text, text) is
  'Reclama un endpoint push para auth.uid(): elimina la fila de otro usuario (navegador compartido) y hace upsert de la propia. La unicidad de endpoint es global; el trade-off es que el canal queda para la última cuenta que lo reclama.';

revoke all on function public.claim_push_subscription(text, text, text) from public;
revoke all on function public.claim_push_subscription(text, text, text) from anon;
grant execute on function public.claim_push_subscription(text, text, text) to authenticated;
