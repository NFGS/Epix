# ADR-0009: CI/CD con GitHub Actions + deploy en Vercel vía CLI

- **Estado:** Aceptado
- **Fecha:** 2026-10-06
- **Decisores:** Fabian (arquitecto)

## Contexto y problema

El proyecto tiene gates de calidad obligatorios definidos en `AGENTS.md` y `SPEC.md` §9
(*Definition of Done*): `lint`, `typecheck`, `test:unit` y `build` en verde, más pruebas E2E
(`playwright`) y una PWA desplegada. La integración continua debe **automatizar y hacer
reproducibles** esos gates en cada push/PR, y el despliegue debe publicar el build a un dominio
público verificable para las evidencias académicas (`REQ-09`).

Sin CI, la calidad queda sujeta a la disciplina manual de un solo desarrollador, y el deploy
manual es propenso a olvidos (construir antes de publicar, olvidar variables de entorno).

## Impulsores de la decisión

- **Automatizar los gates** de `SPEC.md` §9 en cada push y PR.
- **E2E con API mockeada:** no depender de TVmaze real (rate limit, red) en el pipeline.
- **Despliegue reproducible** con variables de entorno seguras (no secretos en el repo).
- **Costo cero** y mínimo mantenimiento.
- **Badge de estado** visible en el README.

## Opciones consideradas

### Opción A — CI/CD en Vercel + GitHub Actions solo para tests

- **Pros:** deploy nativo de Vercel (git integration) sin CLI.
- **Contras:** menos control sobre el orden exacto de gates; duplica la configuración entre
  Vercel y GitHub; el E2E (Playwright con Chromium) encaja mejor en Actions.

### Opción B — SaaS de CI alternativo (CircleCI, GitLab CI, Bitbucket Pipelines)

- **Pros:** funcionalmente equivalentes.
- **Contras:** el repo vive en GitHub y Actions ya es nativo, gratuito y con integración de
  `pnpm`/`actions/setup-node` madura; no aporta ventaja para este tamaño.

### Opción C — GitHub Actions (gates + E2E) + deploy en Vercel vía CLI (elegida)

- **Pros:** un único lugar para los gates; Vercel se usa como destino de hosting con su
  `vercel.json`; deploy reproducible con `vercel --prod --yes` y variables de entorno seguras.
- **Contras:** el deploy por CLI exige token de Vercel en secrets de GitHub (o ejecutarlo
  localmente).

## Resultado de la decisión

Se eligió la **Opción C**. El workflow `.github/workflows/ci.yml` define un job `quality`
(ubuntu-latest, Node 24, `pnpm` con `actions/setup-node` y `cache: pnpm`) que ejecuta, en
orden: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`,
`pnpm build`, instalación de Chromium de Playwright (`playwright install --with-deps chromium`)
y `playwright test`. El E2E corre contra la **API mockeada** (configurada en
`playwright.config.ts`), de modo que el pipeline no depende de la red de TVmaze. Incluye
`concurrency` con `cancel-in-progress` y `timeout-minutes: 20`.

El despliegue se hace en **Vercel** (`vercel.json`: framework `vite`, rewrites SPA `/(.*) →
/index.html`, headers de caché y CSP, ver ADR-0007), publicado con la CLI de Vercel
(`vercel --prod`). Las variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` viven en el
entorno de Vercel, nunca en el repo. La release `v1.0.0` se preparó en el commit `99d039c`
(*ci: agrega workflow de calidad, badge de estado y prepara la v1.0.0*) y se publicó en
`f3f0280` (*feat(deploy): publica la PWA en Vercel con rewrites SPA y headers de caché*). El
README muestra el badge `CI` enlazado al workflow.

## Consecuencias

### Positivas

- Gates de `SPEC.md` §9 automatizados y reproducibles en cada push/PR.
- E2E estable (API mockeada) y deploy verificable en `https://epix-xi.vercel.app`.
- Calidad visible vía badge en el README; cero secretos en el repo.

### Negativas / Riesgos

- El deploy por CLI depende de la disponibilidad del token de Vercel en secrets (o de ejecutarlo
  localmente); no hay "preview deployments" automáticos por PR en esta configuración.
- El job de CI instala Chromium en cada ejecución (más tiempo), mitigado en el plan futuro
  (`CHANGELOG.md` "Unreleased": caché de Playwright).

### Deuda técnica asumida

- Sin etapa de `pnpm audit`/CodeQL/Dependabot todavía (anotado como trabajo futuro en
  `CHANGELOG.md`).

## Cumplimiento / Enlaces

- `.github/workflows/ci.yml`; `vercel.json`; `playwright.config.ts`.
- `README.md` (badge CI y enlace de producción).
- `SPEC.md` §9; `CHANGELOG.md` (v1.0.0 y Unreleased).
