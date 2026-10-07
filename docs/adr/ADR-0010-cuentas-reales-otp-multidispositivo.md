# ADR-0010: Cuentas reales con OTP por correo y sincronización multi-dispositivo

- **Estado:** Aceptado
- **Fecha:** 2026-10-07
- **Decisores:** Fabian (arquitecto)

## Contexto y problema

El Sprint 5.2 convierte la **identidad anónima** de ADR-0004 en **cuentas reales** sin
construir ni operar un backend propio. La auth anónima tiene dos límites conocidos: el `uid`
vive en el almacenamiento del navegador (si el usuario limpia los datos, lo pierde) y no
permite llevar favoritos, historial y telemetría a otro dispositivo. Además, el uso en
dispositivos compartidos exige que **cerrar sesión** no deje datos del usuario atrás.

ADR-0004 dejó decidido el camino: cuando existan cuentas, la sesión anónima se convierte
**sin cambiar el `uid`** (`updateUser({ email })`), de modo que todas las filas
(`favorites`, `watch_history`, `usage_events`, `preferences`, `sync_cursors`) siguen siendo
del mismo usuario y **no hay migración de datos**.

El alcance añade tres requisitos técnicos: **Realtime** para que un cambio hecho en el
dispositivo A aparezca en B, **serialización del sync entre pestañas** y **estado de sync
compartido** entre ellas.

## Impulsores de la decisión

- **Vinculación same-uid sin migración** (promesa explícita de ADR-0004).
- **Cero operación de servidores**: se usa el SMTP y GoTrue del plan gratuito de Supabase.
- **Bajo roce en móvil**: OTP de 6 dígitos, sin contraseñas que recordar ni restablecer.
- **Seguridad (RNF-02)**: solo `anon key` en el cliente; RLS por `auth.uid()` sigue intacto.
- **Multi-dispositivo y multi-pestaña reales**: Realtime + Web Locks + BroadcastChannel.
- **Privacidad en dispositivos compartidos (RNF-03)**: el cierre de sesión limpia los datos
  locales del usuario.

## Opciones consideradas

### Opción A — Correo + contraseña (`signUp` / `signInWithPassword`)

- **Pros:** flujo conocido; soportado nativamente.
- **Contras:** hay que gestionar contraseñas (reseteo, filtrado, reglas de complejidad,
  credenciales filtradas); más fricción en móvil; más superficie OWASP. En anónimo→permanente
  exige elegir contraseña en el mismo flujo de vinculación.

### Opción B — OAuth (Google, GitHub…)

- **Pros:** sin contraseñas; proveedores gestionan el factor.
- **Contras:** requiere configurar cada provider (client id/secret) y cuentas externas; en la
  vinculación anónimo→OAuth, Supabase **crea una identidad nueva** (el `uid` cambia), lo que
  rompería la promesa de "sin migrar datos" o forzaría migración explícita. Peor encaje
  académico (menos control demostrable del flujo).

### Opción C — OTP por correo sin contraseñas (elegida)

- **Pros:** sin contraseñas; un único factor ya soportado por GoTrue; **dos caminos con el
  mismo método**: `signInWithOtp` + `verifyOtp` (`type: 'email'`) para entrar en un
  dispositivo, y `updateUser({ email })` + `verifyOtp` (`type: 'email_change'`) para vincular
  conservando el `uid`; el código de 6 dígitos se escribe en un `input` simple (mejor UX móvil
  que un deep link).
- **Contras:** depende del correo; el plan free de Supabase limita los envíos por hora y usa
  plantillas por defecto con **enlace mágico**, no con código: hay que personalizarlas
  (`{{ .Token }}`) y, para producción, conectar SMTP propio.

## Resultado de la decisión

Se eligió la **Opción C**. Implementación en `src/infrastructure/supabase/auth.ts`
(puerto `CloudAuth` en `src/application/ports/auth.ts`), con errores tipados
(`AuthError` con `code` traducible: `invalid-email`, `invalid-code`, `expired-code`,
`rate-limited`, `email-in-use`, `network`, `unknown`).

1. **Entrar en otro dispositivo:** `signInWithOtp({ email })` →
   `verifyOtp({ email, token, type: 'email' })`.
2. **Vincular el anónimo (mismo dispositivo):** `updateUser({ email })` →
   `verifyOtp({ email, token, type: 'email_change' })`. Los datos **no se migran** porque el
   `uid` no cambia. La UI lo explica: *«Vincula tu cuenta aquí primero; luego inicia sesión en
   tus otros dispositivos»*.
3. **Cierre de sesión:** `signOut({ scope: 'local' })` (no expulsa las demás sesiones del
   usuario) + borrado de datos locales de usuario (favoritos, historial, `usageEvents`,
   `outbox` y cursores `syncMeta`); se conservan las **preferencias de UI** (tema, idioma,
   filtros), que son del dispositivo. Se marca `epix:auth:signed-out` en `localStorage` para
   que el motor **no cree una sesión anónima nueva** y el estado «Sin iniciar sesión» sea
   estable. Razón del borrado: **dispositivos compartidos** (el siguiente usuario no ve los
   datos del anterior).
4. **Realtime:** `supabase/migrations/002_realtime.sql` añade `public.favorites` a la
   publicación `supabase_realtime` (idempotente vía
   `do $$ ... exception when duplicate_object ... $$`). Los eventos se aplican a Dexie con
   **last-write-wins** reutilizando `mergeFavorites`; `useLiveQuery` refresca la UI sola.
   Los `DELETE` en duro se ignoran (Epix borra con tombstones `deleted_at`).
5. **Multi-pestaña:** **Web Locks** (`navigator.locks.request('epix:sync', …)`) serializa
   `syncNow()` entre pestañas, con fallback directo si el navegador no los soporta;
   **BroadcastChannel** (`epix-sync`) difunde cada transición (syncing/idle/error) y la
   pestaña B muestra «Sincronizando…» mientras la pestaña A sincroniza.
6. **Composición:** `createLazySupabaseAuth()` y `createLazySupabaseSyncAdapter()` cargan
   `@supabase/supabase-js` en chunk aparte; sin `VITE_SUPABASE_*` la cuenta queda en
   «no configurada» (modo solo local) sin errores.

## Consecuencias

### Positivas

- Cuentas reales **sin backend propio** y **sin migrar filas** (same-uid, ADR-0004 cumplido).
- Multi-dispositivo con datos en vivo (Realtime) y multi-pestaña sin carreras (Locks).
- Cierre de sesión apto para dispositivos compartidos (RNF-03) sin perder la cuenta en la nube.
- El bundle inicial no crece con `@supabase/supabase-js` (sigue perezoso), verificado con
  `size-limit`.

### Negativas / Riesgos

- **SMTP propio pendiente:** el plan free usa el SMTP compartido de Supabase con límite de
  correos por hora; al superarlo la UI muestra el error `rate-limited` y pide esperar.
  Mitigación futura: conectar SMTP propio (Resend/SES) en Authentication → SMTP.
- **Plantillas de correo:** «Magic Link» y «Change Email» deben incluir `{{ .Token }}` para
  enviar el código de 6 dígitos; es un paso manual del dashboard documentado en el informe.
- **Datos locales previos a un login con otra cuenta:** los favoritos locales no se borran al
  iniciar sesión; el pull/merge LWW los conserva y se suben a la cuenta que entra. Es
  deliberado (no se pierde trabajo offline) pero debe conocerse.
- **Realtime depende de la migración 002:** si no se ejecuta, la app sigue funcionando con el
  sync normal (degradación elegante, sin errores).
- **Sin recuperación/borrado de cuenta desde la app:** el derecho al olvido por tabla existe
  («Mi actividad»), pero no hay «eliminar mi cuenta» completo.

### Deuda técnica asumida

- Probar el flujo con "Secure email change" (doble confirmación) y con un segundo correo.
- Migrar a SMTP propio antes de un uso público intensivo.

## Cumplimiento / Enlaces

- `src/application/ports/auth.ts`, `src/infrastructure/supabase/{auth,create-auth,session-policy}.ts`.
- `src/application/use-cases/clear-user-data.ts`; `src/presentation/hooks/use-account.ts`.
- `src/infrastructure/sync/{favorites-realtime,cross-tab-sync}.ts`;
  `src/app/FavoritesRealtimeBootstrap.tsx`; `src/presentation/screens/AccountScreen.tsx`.
- `supabase/migrations/002_realtime.sql`; `docs/modelo-datos.md` §2–3; `ADR-0004`.
