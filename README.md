# 🎬 Epix

[![CI](https://github.com/NFGS/Epix/actions/workflows/ci.yml/badge.svg)](https://github.com/NFGS/Epix/actions/workflows/ci.yml)

**PWA de series y televisión construida sobre la API pública de [TVmaze](https://www.tvmaze.com/api).**

Proyecto académico del Tecnólogo en Análisis y Desarrollo de Software (SENA — Armenia, Quindío)
en articulación con Ingeniería de Sistemas y Computación (Universidad del Quindío).

---

## ✨ ¿Qué hace Epix?

Aplicación web progresiva (PWA) instalable que permite:

- 🔍 Buscar series y ver detalle, elenco, episodios y agenda.
- 🎛️ Personalizar la experiencia (tema, idioma, géneros, rango de edad) con preferencias guardadas y editables.
- 📍 Usar el GPS para mostrar la programación de TV del país del usuario.
- 🔔 Enviar notificaciones locales de nuevos episodios de tus favoritos.
- ⭐ Guardar favoritos e historial **offline-first** (funciona sin conexión) y sincronizarlos a la nube.
- 📊 Registrar telemetría de uso (fecha/hora, opciones, búsquedas) en una base de datos externa.

## 🏗️ Stack

| Capa | Tecnología |
| --- | --- |
| UI | React 19 + TypeScript + Tailwind CSS 4 |
| Build / PWA | Vite + `vite-plugin-pwa` (Workbox) |
| Datos remotos | TVmaze API (REST, sin API key) |
| Persistencia local | Dexie (IndexedDB) + TanStack Query |
| Nube / telemetría | Supabase (PostgreSQL + RLS; auth anónima → cuentas OTP) |
| Calidad | ESLint + Prettier + Vitest + Playwright + Lighthouse |

> 📐 Arquitectura, requisitos y decisiones: ver [`SPEC.md`](./SPEC.md) y [`docs/`](./docs/).

## 🚀 Quickstart

```bash
pnpm install     # dependencias
pnpm dev         # servidor de desarrollo (http://localhost:5173)
pnpm build       # build de producción (genera PWA)
pnpm preview     # sirve el build (probamos SW/manifest)
pnpm test:unit   # pruebas unitarias
pnpm test:coverage # cobertura (domain/application ≥ 70 %)
pnpm test:e2e    # pruebas end-to-end (Playwright, API mockeada)
pnpm lint        # análisis estático
pnpm typecheck   # verificación de tipos
```

## 🌐 Producción

- **App en vivo:** [https://epix-xi.vercel.app](https://epix-xi.vercel.app)
- **Despliegue automático (integración nativa Vercel ↔ GitHub):** cada push a `main` construye y
  publica solo; las ramas/PR obtienen previews. Sin tokens ni comandos manuales (el flujo por CLI
  quedó retirado). SPA rewrites y headers de caché en [`vercel.json`](./vercel.json).
- **Variables en Vercel:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`,
  `VITE_SENTRY_DSN` · para source maps: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
- **Operación:** CI (lint, tipos, tests, Lighthouse, presupuesto) + CodeQL + Dependabot; cron diario
  de recordatorios push (GitHub Actions) y workflow `keepalive` mensual.
- **Nube activa:** Supabase (`epix-db`) — favoritos, historial y telemetría sincronizan a PostgreSQL
  con RLS (sesiones anónimas → cuentas OTP).
- **🔒 Infraestructura estable:** el deploy se mantiene tal como está (integración nativa; decisión
  del owner, 2026-10-08) — no se modifica ni se migra.

## 📚 Documentación

| Documento | Contenido |
| --- | --- |
| [`SPEC.md`](./SPEC.md) | Especificación: requisitos, arquitectura objetivo y roadmap |
| [`docs/requisitos.md`](./docs/requisitos.md) | RF/RNF con criterios de aceptación (Gherkin) |
| [`docs/glosario.md`](./docs/glosario.md) | Glosario técnico móvil/UX |
| [`docs/referencias.md`](./docs/referencias.md) | Referencias en formato APA 7 |
| [`docs/investigacion/`](./docs/investigacion/) | Marco conceptual con fuentes |
| [`docs/postman/`](./docs/postman/) | Colección Postman de TVmaze |
| [`docs/adr/`](./docs/adr/) | Decisiones arquitectónicas en formato MADR |
| [`tools/alignment-check/`](./tools/alignment-check/) | Alineación de los 4 entornos (directorio · GitHub · Notion · Obsidian) |

## ⚖️ Licencias y atribución

- **Datos e imágenes:** proporcionados por [TVmaze](https://www.tvmaze.com) bajo licencia
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Epix incluye atribución
  visible con enlace a TVmaze.
- **Código:** proyecto académico sin fines comerciales.
