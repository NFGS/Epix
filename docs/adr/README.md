# Registro de Decisiones Arquitectónicas (ADR)

Decisiones de arquitectura del proyecto **Epix**, registradas en formato **MADR 3.x**
(*Markdown Architectural Decision Records*). Cada ADR documenta el contexto, los impulsores,
las opciones consideradas con sus trade-offs, la decisión tomada y sus consecuencias.

## Índice

| N.º | Título | Estado | Fecha |
| --- | --- | --- | --- |
| [ADR-0001](./ADR-0001-cliente-pwa-react-vite-typescript.md) | Cliente PWA con React 19 + Vite + TypeScript | Aceptado | 2026-10-05 |
| [ADR-0002](./ADR-0002-clean-architecture-ligera-puertos-adaptadores.md) | Clean Architecture ligera por capas con puertos y adaptadores | Aceptado | 2026-10-05 |
| [ADR-0003](./ADR-0003-persistencia-offline-first-dexie-outbox-lww.md) | Persistencia offline-first con Dexie/IndexedDB + outbox + LWW | Aceptado | 2026-10-06 |
| [ADR-0004](./ADR-0004-supabase-postgresql-rls-auth-anonima.md) | Supabase (PostgreSQL + RLS + auth anónima) como backend | Aceptado | 2026-10-06 |
| [ADR-0005](./ADR-0005-service-worker-injectmanifest-workbox.md) | Service worker propio con `injectManifest` + Workbox | Aceptado | 2026-10-06 |
| [ADR-0006](./ADR-0006-contratos-zod-jitless-csp.md) | Contratos con Zod en todos los límites + `z.config({ jitless: true })` | Aceptado | 2026-10-06 |
| [ADR-0007](./ADR-0007-csp-header-http-vercel.md) | CSP como header HTTP en Vercel (no `<meta>`) | Aceptado | 2026-10-06 |
| [ADR-0008](./ADR-0008-sistema-diseno-open-design-spotify-runway.md) | Sistema de diseño propio adoptado de Open Design (Spotify × Runway) | Aceptado | 2026-10-05 |
| [ADR-0009](./ADR-0009-cicd-github-actions-vercel.md) | CI/CD con GitHub Actions + deploy en Vercel vía CLI | Aceptado | 2026-10-06 |
| [ADR-0010](./ADR-0010-cuentas-reales-otp-multidispositivo.md) | Cuentas reales con OTP por correo y sincronización multi-dispositivo | Aceptado | 2026-10-07 |
| [ADR-0011](./ADR-0011-typescript-7-diferido.md) | Actualización a TypeScript 7 (diferida hasta typescript-eslint ≥ 7.1) | Aceptado | 2026-10-07 |

## Convención

- **Formato:** MADR 3.x (Contexto y problema → Impulsores → Opciones consideradas → Resultado
  de la decisión → Consecuencias → Cumplimiento/Enlaces).
- **Estado** inicial: `Aceptado`. Cuando una decisión se revierta o sustituya, el ADR anterior
  pasará a `Reemplazado por ADR-XXXX` (nunca se reescribe en silencio).
- **Trazabilidad:** cada ADR referencia requisitos (`SPEC.md`, `docs/requisitos.md`), archivos
  de código y commits reales del repositorio.
