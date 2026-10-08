# AGENTS.md — Contexto del proyecto Epix

## 🎬 Visión general

**Epix** es una PWA de series y TV que consume la API pública de **TVmaze**. Es un proyecto
académico del SENA ADSO (Armenia, Quindío) que exige, como mínimo:

1. Consumo de la API de TVmaze.
2. Personalización de interfaz y contenido (edad, géneros, tema…), guardable y editable.
3. Uso del GPS del móvil.
4. Uso de notificaciones.
5. Telemetría de uso (fecha/hora, opciones usadas, búsquedas) hacia una base de datos.

Además: PWA instalable, favoritos e historial offline-first con sincronización,
colección Postman como evidencia y documentación publicada en Notion.

> **Antes de cualquier cambio**: leer `SPEC.md` y `docs/requisitos.md`.

## 🧱 Stack y decisiones fijas

- **Frontend/PWA**: React 19 + TypeScript + Tailwind CSS 4 + Vite + `vite-plugin-pwa` (Workbox).
- **HTTP/estado remoto**: fetch + Zod (validación de contratos) + TanStack Query.
- **Persistencia local**: Dexie (IndexedDB) para favoritos, historial, preferencias y outbox.
- **Nube**: Supabase (PostgreSQL + RLS + auth anónima) para telemetría y sincronización.
- **Tests**: Vitest + Testing Library (unit) y Playwright (E2E, capturas).
- **Calidad**: ESLint + Prettier. Gates obligatorios: `lint`, `typecheck`, `test:unit`, `build`.
- **Diseño**: sistema propio en `docs/design/DESIGN.md` (Open Design: base *Spotify* × disciplina *Runway*, acento Epix `#6C4CF1`; ver `.open-design.json`).

## 🗂️ Arquitectura (Clean Architecture ligera)

```
src/
├── app/            # Router, providers, tema
├── domain/         # Entidades y puertos (Show, Episode, Preference…) — SIN imports de React
├── application/    # Casos de uso (buscar, favoritear, sincronizar, registrar evento)
├── infrastructure/ # Adaptadores: TVmaze, Dexie, Supabase, geolocalización, sync queue
├── presentation/   # Pantallas, componentes reutilizables, hooks, stores
└── shared/         # Design tokens, utilidades, configuración
```

**Regla de dependencia**: `presentation → application → domain`; `infrastructure` implementa
puertos de `domain`. El dominio no conoce React, fetch ni IndexedDB.

## 📏 Convenciones

- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).
- **Ramas**: cortas y enfocadas (`feat/favoritos-offline`).
- **Idioma**: documentación y UI en español; código y nombres técnicos en inglés.
- **Tipado**: TypeScript estricto; prohibido `any` sin justificación.
- **Seguridad**: cero secretos en el repo (`.env` ignorado); en Supabase solo `anon key` con RLS;
  jamás `service_role` en el cliente. Datos de telemetría = mínimo necesario + consentimiento.
- **Accesibilidad**: WCAG 2.2 AA, touch targets ≥ 44 px, contraste, ARIA en navegación.
- **Rendimiento**: medir antes de optimizar; presupuesto bundle inicial < 250 KB gzip.
- **Repo limpio**: nunca versionar `Memory/` (material de clase) ni archivos/directorios de
  OpenCode (`.opencode/`, `opencode.json`); ya están protegidos en `.gitignore`.

## 🌐 Reglas de uso de TVmaze

- Base: `https://api.tvmaze.com` — **sin API key**, CORS habilitado, JSON.
- **Rate limit**: ≥ 20 llamadas/10 s por IP → manejar `429` con backoff y caché.
- Caché del servicio: 60 min (índices y schedule completo: 24 h). Imágenes: cacheables indefinidamente.
- **Atribución obligatoria** (CC BY-SA): enlace visible a TVmaze en la app.
- Endpoints principales: `/search/shows`, `/shows/:id?embed[]=episodes&embed[]=cast`,
  `/shows/:id/episodes`, `/schedule?country=XX&date=YYYY-MM-DD`, `/schedule/web`, `/updates/shows`.

## ⚙️ Comandos (a partir de Fase 2)

```bash
pnpm dev         # desarrollo
pnpm build       # build + PWA
pnpm lint        # ESLint
pnpm typecheck   # tsc --noEmit
pnpm test:unit   # Vitest
pnpm test:coverage # cobertura (umbral 70 % en domain/application)
pnpm test:e2e    # Playwright
```

## 📌 Estado del proyecto

- [x] Fase 0 — Documentación base (README, AGENTS, SPEC, requisitos, glosario, referencias).
- [x] Fase 1 — Investigación + documentación Notion.
- [x] Fase 2 — Scaffolding, arquitectura y diseño base (incremento 1: tokens, layout, navegación, componentes, PWA, tests).
- [x] Fase 3 · Incrementos 2–7 — API TVmaze + caché, offline-first con sync, personalización con filtros, GPS, notificaciones y telemetría.
- [x] Calidad — 498 pruebas unitarias + 16 E2E (Playwright, API mockeada); cobertura domain/application 99 %; Lighthouse producción en el rango 86–93/100/100 (varianza de red); auditoría de seguridad sin hallazgos críticos.
- [x] Sprint 5.0 (fundaciones) — ADRs (MADR), cobertura con umbrales, logger tipado, validación de entorno con Zod, CI ampliado (Dependabot, CodeQL, auditoría, artefacto de cobertura) y documentos de comunidad (LICENSE, CHANGELOG, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT).
- [x] Sprint 5.1 (rendimiento) — code splitting por ruta, shell estático de arranque (FCP 2.1 s → 1.0 s), hints LCP/CLS, «Mostrar más» en búsquedas largas y presupuesto `size-limit` en CI.
- [x] Sprint 5.2 (cuentas reales) — OTP por correo, vinculación anónimo→permanente (mismo `uid`), Realtime en favoritos, sync multi-pestaña (Web Locks + BroadcastChannel) y pantalla «Cuenta» (ADR-0010). Para códigos reales: SMTP propio (el proveedor por defecto del plan free no permite editar plantillas).
- [x] Sprint 5.3 (pulido) — UX de «nueva versión disponible» (SW en modo prompt), manifest con capturas y atajos, `Permissions-Policy` + COOP y página de privacidad in-app (`/privacy`).
- [x] Despliegue — producción en [epix-xi.vercel.app](https://epix-xi.vercel.app) (Vercel; deep links, service worker y CSP verificados con navegador real).
- [x] Nube — Supabase `epix-db` activo (migración + RLS + sesiones anónimas + env vars en Vercel); sincronización de favoritos y telemetría verificada en producción.
- [x] Operación — cron diario de recordatorios push (GitHub Actions, 12:00 UTC), Sentry activo con evento real verificado (proyecto `epix`), micro-sync de favoritos y verificación multi-dispositivo (PASS 9/9, 2 perfiles aislados + Realtime).
- [ ] Pendiente — capturas en Android físico (`docs/entrega/guia-verificacion-movil.md`) y dominio propio (opcional).
