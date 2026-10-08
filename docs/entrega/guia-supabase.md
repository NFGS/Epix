# Guía — Activar la nube real (Supabase) en Epix

> **Estado: ✅ ACTIVADO (2026-10-06)** — proyecto `epix-db` (`qeadwdtzqgbdbrczhkuf`, región `us-east-1`):
> migración + RLS (24 políticas) + sesiones anónimas + variables en Vercel, verificados end-to-end
> desde producción (favorito «Breaking Bad» en `favorites`, 7 eventos en `usage_events`).
> Esta guía queda como referencia para recrear la configuración desde cero.

> **Cuándo:** cuando quieras sincronizar favoritos e historial entre dispositivos y guardar la
> telemetría en una base de datos real. Sin estos pasos, Epix funciona 100 % local («Solo local»).
> **Tiempo estimado:** 10 minutos. **Costo:** plan gratuito de Supabase.

## 1. Crear el proyecto

1. Entra a [supabase.com](https://supabase.com) → **New project**.
2. Nombre: `epix` · Región: la más cercana (`South America (São Paulo)` es la típica para Colombia).
3. Guarda la contraseña de la base de datos en tu gestor de contraseñas (no se usa en el cliente).

## 2. Activar sesiones anónimas

1. En el panel: **Authentication → Sign In / Providers**.
2. Activa **Anonymous sign-ins** (es la identidad por dispositivo que usa Epix; no pedimos correo).

> ⚠️ Nota de producción: las sesiones anónimas son ideales para demo y proyecto académico;
> para usuarios reales se añadiría un vínculo con cuenta (Apple/Google/email).

## 3. Crear las tablas + RLS

1. Abre **SQL Editor**.
2. Copia TODO el contenido de [`supabase/migrations/001_init.sql`](../../supabase/migrations/001_init.sql)
   y ejecútalo (**Run**).
3. Verifica en **Table Editor** que existen: `profiles`, `preferences`, `favorites`,
   `watch_history`, `usage_events`, `sync_cursors`.
4. Verifica en **Authentication → Policies** que cada tabla tiene políticas de
   `select / insert / update / delete` con `auth.uid() = user_id`.

## 4. Conectar Epix

1. En Supabase: **Project Settings → API**. Copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
2. En el repo, crea tu `.env` (está en `.gitignore`, nunca se sube):
   ```bash
   cp .env.example .env
   # edita .env y pega la URL y la anon key
   ```
3. **Nunca** pegues la `service_role` en el cliente (esa clave salta RLS; es solo para servidores).

## 5. Verificar

```bash
pnpm dev        # o pnpm build && pnpm preview
```

1. **Perfil → Datos y sincronización**: el chip debe pasar de «Solo local» a «Al día» o «Sin conexión».
2. Pulsa **Sincronizar ahora**: favoritos e historial locales viajan a Supabase.
3. En Supabase → **Table Editor → favorites**: aparecen tus filas con `user_id` (el dispositivo).
4. **Telemetría** (si la activaste en Perfil): los eventos llegan a `usage_events` al sincronizar.
5. Prueba multi-dispositivo: abre Epix en otro navegador con el MISMO `.env`… (cada dispositivo
   crea su propia identidad anónima; para compartir datos entre dispositivos haría falta iniciar
   sesión con la misma cuenta — evolución futura documentada en `docs/modelo-datos.md`).

## Cuentas reales (OTP por correo) — Sprint 5.2

Estado actual: pantalla «Cuenta» activa, Realtime habilitado en `favorites` y `site_url` configurada.

**Requisito para enviar códigos reales:** con el proveedor de correo por defecto del plan gratuito,
Supabase **no permite editar plantillas ni subir el límite de envíos** (2/hora). Para producción:

1. Crea una cuenta en un proveedor SMTP transaccional (p. ej. Resend: 3.000 correos/mes gratis).
2. En Supabase: **Authentication → Emails → SMTP Settings** → host, puerto, usuario y clave del proveedor.
3. Con SMTP propio podrás editar las plantillas **Magic Link** y **Change Email** para incluir
   `{{ .Token }}` (el código de 6 dígitos que pide la app) y ajustar `rate_limit_email_sent`.

   **Vía automatizada (recomendada):** con `RESEND_API_KEY` y `SMTP_ADMIN_EMAIL` en
   `~/.config/secrets.env`, ejecuta:

   ```bash
   set -a; . ~/.config/secrets.env; set +a
   node scripts/setup-smtp.mjs
   ```

   El script configura host/puerto/remitente, sube el límite a 30/hora, escribe las plantillas
   con `{{ .Token }}` y verifica el resultado. (Para pruebas sin dominio: usa
   `SMTP_ADMIN_EMAIL=onboarding@resend.dev`, que Resend solo entrega al correo dueño de la cuenta.)

### Alternativas a coste 0 si no tienes dominio propio

Resend sin dominio verificado solo entrega al correo **dueño de la cuenta**. Para enviar códigos
a **cualquier** destinatario sin comprar dominio:

- **Gmail (SMTP):** activa la verificación en 2 pasos de tu cuenta de Google → crea una
  **«Contraseña de aplicación»** → añade a `~/.config/secrets.env`:
  ```
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=465
  SMTP_USER=tucorreo@gmail.com
  SMTP_PASS=contrasena-de-aplicacion
  SMTP_ADMIN_EMAIL=tucorreo@gmail.com
  ```
  y ejecuta el script (detecta el SMTP automáticamente). Gmail permite ≈ 500 correos/día.
- **Brevo (SMTP):** plan gratis (300 correos/día) con verificación de **remitente individual**
  (tu correo, sin dominio); usa sus credenciales SMTP con las mismas variables.

### Cómo verificar un dominio en Resend (referencia futura)

1. Resend → **Domains → Add Domain** → escribe tu dominio.
2. Resend muestra los registros DNS exactos: **MX** y **TXT (SPF)** para el subdominio
   `send.tudominio.com`, y **TXT (DKIM)**.
3. Créalos en tu proveedor de DNS tal cual (nombre y valor).
4. Pulsa **Verify** en Resend (la propagación DNS puede tardar minutos).
5. Cambia `SMTP_ADMIN_EMAIL=no-reply@tudominio.com` y re-ejecuta el script.
4. Prueba completa: Perfil → Cuenta → «Protege tu cuenta» → código → verificar (mismo `uid`, sin migrar datos);
   en otro dispositivo → «Inicia sesión» con el mismo correo → favoritos e historial llegan con el pull.

> ✅ **SMTP configurado (2026-10-07) — Gmail SMTP (coste 0):** host `smtp.gmail.com:465` con
> contraseña de aplicación, plantillas con código `{{ .Token }}`, límite 30/hora y `site_url` de
> producción. **Permite enviar códigos a cualquier destinatario** (Gmail ≈ 500 correos/día).
> Verificado con una prueba real de envío. *(Resend queda documentado abajo como alternativa.)*

## Notificaciones push (VAPID) — desplegado

- **Estado:** ✅ Edge Function `epix-push` desplegada y verificada en producción (acepta JWT de usuario,
  rechaza sin token → 401 y valida `x-cron-secret` → 401 si es incorrecto). Secretos
  `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` y `CRON_SECRET` configurados;
  `VITE_VAPID_PUBLIC_KEY` en Vercel y en `.env`; tabla `push_subscriptions` con RLS (migración 004).
- **Probar en un dispositivo:** Perfil → Notificaciones → activar **«Notificaciones push»** → botón
  «Enviar notificación de prueba» → llega «Epix — Notificaciones push activas» que abre `/account`.
- **Recordatorios diarios (opcional):** invoca la función una vez al día con el secreto de cron, por ejemplo
  desde GitHub Actions (schedule) o `pg_cron` + `pg_net`:
  ```bash
  curl -X POST "$SUPABASE_URL/functions/v1/epix-push" -H "x-cron-secret: $CRON_SECRET"
  ```
  La corrida se detiene sola ante un `429` de TVmaze (devuelve lo enviado) y elimina suscripciones
  muertas (410/404).

## Mantenimiento de la nube (advisors y retención)

- **Purga de datos antiguos:** `public.purge_epix_data(180)` (migración 003) elimina tombstones de
  favoritos, eventos de uso e historial con más de N días. Ejecución manual o programada con `pg_cron`:
  ```sql
  select cron.schedule('epix-purge', '0 4 * * *', $$select public.purge_epix_data(180)$$);
  ```
  (Revocada para `anon`/`authenticated`: solo el propietario puede ejecutarla.)
- **Advisors de Supabase:** aplicadas las mejoras de rendimiento (índices + políticas `auth.uid()`
  con initplan: 26 → 2 avisos informativos). Quedan como *aceptados por diseño*: el aviso de sesiones
  anónimas (modelo de identidad de Epix) y el de contraseñas filtradas (HIBP, exclusivo de planes Pro;
  Epix no usa contraseñas).

## Problemas comunes

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| Chip sigue en «Solo local» | `.env` ausente o mal escrito | Revisa que empiece con `VITE_` y reinicia el servidor |
| Error de permisos al sincronizar | RLS sin políticas o migración incompleta | Reejecuta `001_init.sql` |
| «Anonymous sign-ins disabled» | Falta activar sesiones anónimas | Paso 2 de esta guía |
| Los favoritos no bajan en otro dispositivo | Identidad anónima distinta por dispositivo | Es el comportamiento actual; requiere cuentas reales |
