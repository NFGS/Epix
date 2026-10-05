# Guía — Activar la nube real (Supabase) en Epix

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

## Problemas comunes

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| Chip sigue en «Solo local» | `.env` ausente o mal escrito | Revisa que empiece con `VITE_` y reinicia el servidor |
| Error de permisos al sincronizar | RLS sin políticas o migración incompleta | Reejecuta `001_init.sql` |
| «Anonymous sign-ins disabled» | Falta activar sesiones anónimas | Paso 2 de esta guía |
| Los favoritos no bajan en otro dispositivo | Identidad anónima distinta por dispositivo | Es el comportamiento actual; requiere cuentas reales |
