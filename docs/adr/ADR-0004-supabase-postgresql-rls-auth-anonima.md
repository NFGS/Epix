# ADR-0004: Supabase (PostgreSQL + RLS + auth anónima) como backend

- **Estado:** Aceptado
- **Fecha:** 2026-10-06
- **Decisores:** Fabian (arquitecto)

## Contexto y problema

El curso exige telemetría hacia una base de datos (`REQ-05`: fecha/hora, opciones usadas,
búsquedas) y, por extensión, sincronización de favoritos, historial y preferencias
(`REQ-06`/`REQ-07`). El alcance actual no incluye autenticación con cuentas reales
(`SPEC.md` §3: "se usa identidad anónima"), pero sí exige **seguridad estricta**
(`RNF-02`: "sin secretos en el repo; RLS estricto; solo anon key") y **privacidad**
(`RNF-03`: telemetría opt-in, derecho al borrado).

El dilema: necesitamos una base de datos real y segura **sin** construir ni operar un servidor
propio, y **sin** exponer credenciales en el cliente. Además, hay que dejar un camino limpio
hacia cuentas reales en el futuro sin migrar datos de usuario.

## Impulsores de la decisión

- **Costo operativo cero** y tiempo de un semestre: no hay presupuesto para un VPS ni para
  mantener un backend propio.
- **Seguridad en el cliente** (`RNF-02`): solo `anon key`; la `service_role` nunca sale del
  servidor; todo el acceso pasa por Row Level Security.
- **Aislamiento por usuario** con `auth.uid()` desde el primer día.
- **Identidad anónima** hoy, migrable a cuentas reales mañana **sin migrar filas**.
- **Mínima fricción de integración** con `@supabase/supabase-js` y un esquema SQL versionado.

## Opciones consideradas

### Opción A — Backend propio (Express/Node + PostgreSQL o Mongo)

- **Pros:** control total, sin depender de terceros.
- **Contras:** requiere desplegar, monitorizar y securizar un servicio (`RNF-02`), añadir
  autenticación propia y mantener dos codebases; costo de operación inasumible para el
  alcance y el tiempo disponibles.

### Opción B — Firebase (Firestore + auth anónima)

- **Pros:** integración anónima trivial, realtime, sin servidor.
- **Contras:** modelo NoSQL con reglas de seguridad propias (no SQL estándar ni RLS); más
  difícil de exponer como evidencia académica tipo "filas en una base de datos relacional"
  (`REQ-05`); menor control del esquema y de las migraciones.

### Opción C — Supabase (PostgreSQL + RLS + auth anónima) (elegida)

- **Pros:** PostgreSQL real con migraciones SQL versionadas; RLS por `auth.uid()`; auth
  anónima nativa (`signInAnonymously`); cliente ligero con chunk perezoso; free tier
  suficiente para evidencia académica.
- **Contras:** dependencia de un proveedor; la capa gratuita tiene límites (pausas por
  inactividad, cuotas).

## Resultado de la decisión

Se eligió la **Opción C**. El esquema se define en `supabase/migrations/001_init.sql` con las
tablas `profiles`, `preferences`, `favorites`, `watch_history`, `usage_events` y
`sync_cursors`, **todas** con `enable row level security` y políticas uniformes
`using (auth.uid() = user_id)` / `with check (auth.uid() = user_id)` para select/update/delete
e insert respectivamente.

El cliente (`src/infrastructure/supabase/client.ts`) crea el cliente **solo con la anon key**
leída de `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (`env.ts`); si faltan, la app funciona
en modo "solo local" (el adaptador devuelve `null`). La sesión se obtiene con
`signInAnonymously()` en `src/infrastructure/supabase/supabase-sync.adapter.ts`
(`getUserId()`), y se observa `onAuthStateChange` para invalidar el `userId` cacheado (R-14).
El módulo `@supabase/supabase-js` se carga en un chunk aparte vía `createLazySupabaseSyncAdapter()`
para no lastrar el bundle inicial (`RNF-01`).

**Camino a cuentas reales:** al habilitar email/password u OAuth, la sesión anónima se
convierte **sin cambiar el `uid`** usando `supabase.auth.updateUser({ email, password })`.
Como todas las filas referencian `auth.users(id)` por `user_id`, el usuario conserva sus
favoritos, historial, preferencias y telemetría **sin migrar datos**. La decisión quedó
documentada en el commit `ea568fc` (*docs: activa y documenta Supabase en producción*).

## Consecuencias

### Positivas

- `RNF-02`/`RNF-03` satisfechos: RLS estricto, solo anon key, borrado por el dueño
  ("Mi actividad" ejecuta `delete ... eq('user_id', uid)`).
- Telemetría y sincronización verificadas end-to-end en producción (`docs/evidencias/`).
- Migración a cuentas reales sin migración de datos (mismo `uid`).

### Negativas / Riesgos

- La identidad anónima se pierde si el usuario limpia los datos del navegador (el `uid` vive
  en el almacenamiento local de la sesión).
- Dependencia del proveedor y de su free tier.
- `coords` (columna `point`) queda **reservada** en el esquema pero el cliente nunca la
  escribe (INFO-03), evitando recolectar ubicación sin consentimiento.

### Deuda técnica asumida

- Al pasar a cuentas reales habrá que añadir flujo de login/registro y revisar la política de
  "borrado" para ajustarse a `updateUser` con verificación de email.

## Cumplimiento / Enlaces

- `supabase/migrations/001_init.sql`; `src/infrastructure/supabase/{client,env,create-sync-adapter,supabase-sync.adapter}.ts`.
- `docs/modelo-datos.md` §2 (seguridad RLS).
- `docs/requisitos.md` (`RNF-02`, `RNF-03`); `SPEC.md` §3 y §5.
