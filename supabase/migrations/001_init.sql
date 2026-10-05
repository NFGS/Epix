-- Epix — Migración inicial (Supabase / PostgreSQL)
--
-- ANTES DE EJECUTAR:
--   1. En el dashboard de Supabase: Authentication → Providers → activa «Anonymous sign-ins».
--   2. Abre el SQL Editor y ejecuta este archivo completo.
--   3. Copia la URL del proyecto y la anon key a `.env` (nunca la service_role):
--        VITE_SUPABASE_URL=https://<proyecto>.supabase.co
--        VITE_SUPABASE_ANON_KEY=<anon-key>
--
-- Esquema copiado de `docs/modelo-datos.md` §2 con RLS estricto por `auth.uid()`.

-- Perfil mínimo por dispositivo (auth anónima de Supabase)
create table public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

-- Preferencias (1:1 con el perfil)
create table public.preferences (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  theme                 text not null default 'system',
  language              text not null default 'es',
  favorite_genres       text[] not null default '{}',
  max_age_rating        text not null default 'TV-14',
  country               char(2),
  country_source        text check (country_source in ('gps','manual')),
  notifications_enabled boolean not null default false,
  telemetry_enabled     boolean not null default false,
  updated_at            timestamptz not null default now()
);

-- Favoritos (n:1 con el perfil)
create table public.favorites (
  user_id    uuid not null references auth.users (id) on delete cascade,
  show_id    int  not null,
  snapshot   jsonb not null,              -- datos mínimos de la serie (TVmaze)
  added_at   timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,                 -- borrado lógico (permite sincronizar bajas)
  primary key (user_id, show_id)
);

-- Historial (append-only, idempotente por id de evento)
create table public.watch_history (
  id          uuid primary key,           -- generado en el cliente
  user_id     uuid not null references auth.users (id) on delete cascade,
  show_id     int,
  event_type  text not null,              -- view | search | schedule_open
  query       text,
  occurred_at timestamptz not null,
  timezone    text,
  created_at  timestamptz not null default now()
);

-- Telemetría de uso (mínimo necesario + consentimiento)
create table public.usage_events (
  id         uuid primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  event_type text not null,               -- session_start | search | show_open | favorite_add | ...
  occurred_at timestamptz not null,
  timezone   text,
  country    char(2),
  coords     point,                       -- RESERVADA: el cliente nunca la escribe (INFO-03);
                                          -- solo se usaría con consentimiento explícito de ubicación + telemetría
  app_version text,
  payload    jsonb
);

-- Cursores de sincronización
create table public.sync_cursors (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  last_pulled_at timestamptz not null default 'epoch',
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Seguridad: RLS estricto en todas las tablas (solo el dueño ve/edita sus filas)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.preferences enable row level security;
alter table public.favorites enable row level security;
alter table public.watch_history enable row level security;
alter table public.usage_events enable row level security;
alter table public.sync_cursors enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = user_id);

create policy "preferences_select_own" on public.preferences
  for select using (auth.uid() = user_id);
create policy "preferences_insert_own" on public.preferences
  for insert with check (auth.uid() = user_id);
create policy "preferences_update_own" on public.preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "preferences_delete_own" on public.preferences
  for delete using (auth.uid() = user_id);

create policy "favorites_select_own" on public.favorites
  for select using (auth.uid() = user_id);
create policy "favorites_insert_own" on public.favorites
  for insert with check (auth.uid() = user_id);
create policy "favorites_update_own" on public.favorites
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "favorites_delete_own" on public.favorites
  for delete using (auth.uid() = user_id);

create policy "watch_history_select_own" on public.watch_history
  for select using (auth.uid() = user_id);
create policy "watch_history_insert_own" on public.watch_history
  for insert with check (auth.uid() = user_id);
create policy "watch_history_update_own" on public.watch_history
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "watch_history_delete_own" on public.watch_history
  for delete using (auth.uid() = user_id);

create policy "usage_events_select_own" on public.usage_events
  for select using (auth.uid() = user_id);
create policy "usage_events_insert_own" on public.usage_events
  for insert with check (auth.uid() = user_id);
create policy "usage_events_update_own" on public.usage_events
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "usage_events_delete_own" on public.usage_events
  for delete using (auth.uid() = user_id);

create policy "sync_cursors_select_own" on public.sync_cursors
  for select using (auth.uid() = user_id);
create policy "sync_cursors_insert_own" on public.sync_cursors
  for insert with check (auth.uid() = user_id);
create policy "sync_cursors_update_own" on public.sync_cursors
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sync_cursors_delete_own" on public.sync_cursors
  for delete using (auth.uid() = user_id);
