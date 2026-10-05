# 🎬 Epix

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
| Nube / telemetría | Supabase (PostgreSQL + RLS + auth anónima) |
| Calidad | ESLint + Prettier + Vitest + Playwright + Lighthouse |

> 📐 Arquitectura, requisitos y decisiones: ver [`SPEC.md`](./SPEC.md) y [`docs/`](./docs/).

## 🚀 Quickstart

```bash
pnpm install     # dependencias
pnpm dev         # servidor de desarrollo (http://localhost:5173)
pnpm build       # build de producción (genera PWA)
pnpm preview     # sirve el build (probamos SW/manifest)
pnpm test:unit   # pruebas unitarias
pnpm test:e2e    # pruebas end-to-end (Playwright, API mockeada)
pnpm lint        # análisis estático
pnpm typecheck   # verificación de tipos
```

## 🌐 Producción

- **App desplegada:** [https://epix-xi.vercel.app](https://epix-xi.vercel.app) (Vercel)
- Build: `pnpm build` (salida `dist/`) · SPA rewrites y headers de caché en [`vercel.json`](./vercel.json)
- Modo actual: **«Solo local»** (sin Supabase). Al configurar `VITE_SUPABASE_*` se requiere un nuevo deploy.

## 📚 Documentación

| Documento | Contenido |
| --- | --- |
| [`SPEC.md`](./SPEC.md) | Especificación: requisitos, arquitectura objetivo y roadmap |
| [`docs/requisitos.md`](./docs/requisitos.md) | RF/RNF con criterios de aceptación (Gherkin) |
| [`docs/glosario.md`](./docs/glosario.md) | Glosario técnico móvil/UX |
| [`docs/referencias.md`](./docs/referencias.md) | Referencias en formato APA 7 |
| [`docs/investigacion/`](./docs/investigacion/) | Marco conceptual con fuentes |
| [`docs/postman/`](./docs/postman/) | Colección Postman de TVmaze |

## ⚖️ Licencias y atribución

- **Datos e imágenes:** proporcionados por [TVmaze](https://www.tvmaze.com) bajo licencia
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Epix incluye atribución
  visible con enlace a TVmaze.
- **Código:** proyecto académico sin fines comerciales.
