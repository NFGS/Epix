# Contribuir a Epix

¡Gracias por querer aportar! Este documento describe el flujo de trabajo y los
estándares del proyecto (proyecto académico SENA ADSO + Uniquindío, mantenido en
[github.com/NFGS/Epix](https://github.com/NFGS/Epix)).

## Requisitos previos

- Node.js **≥ 24** (usa `nvm` si es necesario)
- **pnpm 12** (`corepack enable` respeta `packageManager` del `package.json`)
- Chromium para E2E: `pnpm exec playwright install chromium`

## Puesta en marcha

```bash
pnpm install
pnpm dev                      # desarrollo en http://localhost:5173
pnpm build && pnpm preview    # PWA real (service worker, offline)
```

## Gates obligatorios (los mismos que CI)

```bash
pnpm lint          # ESLint con --max-warnings 0
pnpm typecheck     # tsc estricto
pnpm test:unit     # Vitest
pnpm test:coverage # cobertura (domain/application ≥ 70 %)
pnpm test:e2e      # Playwright (API mockeada)
pnpm build         # build + PWA
```

Ningún PR se considera listo si alguno falla. El CI (`.github/workflows/ci.yml`)
los ejecuta en cada push.

## Flujo de ramas y commits

- Ramas cortas y enfocadas: `feat/favoritos-offline`, `fix/sync-lww`, `docs/adr-auth`.
- Commits con [Conventional Commits](https://www.conventionalcommits.org/es/):
  `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `ci:`.
- PR pequeño y revisable; describe **qué**, **por qué** y **cómo se verificó**
  (pega la salida de los gates).

## Dónde va cada cambio (Clean Architecture ligera)

| Quiero… | Capa |
| --- | --- |
| Reglas/entidades puras | `src/domain/` (sin React, Dexie, Supabase) |
| Casos de uso | `src/application/` |
| Integración externa (TVmaze, Dexie, Supabase, GPS, notificaciones) | `src/infrastructure/` |
| Pantallas y componentes | `src/presentation/` |
| Utilidades y tokens | `src/shared/` |

La regla de dependencia la protege ESLint (`no-restricted-imports` en
`domain/` y `application/`). Consulta `docs/adr/` para el contexto de cada
decisión.

## Estilo

- UI y documentación en **español**; código e identificadores en **inglés**.
- TypeScript estricto; prohibido `any` sin justificación en comentario.
- Accesibilidad WCAG 2.2 AA (touch targets ≥ 44 px, foco visible, ARIA).
- Cero secretos en el repo: usa `.env` (ignorado); en Supabase, solo la
  `anon key`.
