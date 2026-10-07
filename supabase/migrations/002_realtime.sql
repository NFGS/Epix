-- Epix — Migración 002: Realtime para favoritos multi-dispositivo
--
-- QUÉ HACE
--   Añade `public.favorites` a la publicación `supabase_realtime` para que el
--   cliente reciba los cambios (INSERT/UPDATE con tombstones) al instante y
--   los aplique en Dexie con last-write-wins (Sprint 5.2).
--
-- ANTES DE EJECUTAR
--   1. Supabase → Database → Replication: la publicación `supabase_realtime`
--      existe por defecto; este script la reutiliza.
--   2. RLS ya está activo en `public.favorites` (001_init.sql); Realtime lo
--      respeta: solo llegan las filas de `auth.uid()`.
--   3. En el SQL Editor ejecuta este archivo completo. Es IDEMPOTENTE:
--      puede re-ejecutarse sin error gracias a la guarda `duplicate_object`.
--
-- NOTA SOBRE BORRADOS
--   Epix nunca borra filas en duro: marca `deleted_at` con un upsert, así que
--   los borrados también viajan como cambios de fila. Los eventos DELETE sin
--   snapshot se ignoran en el cliente (ver `supabase-sync.adapter.ts`).

do $$
begin
  alter publication supabase_realtime add table public.favorites;
exception
  when duplicate_object then
    null; -- La tabla ya estaba publicada: nada que hacer.
end $$;
