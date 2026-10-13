# ADR-0012 — Identidad visual «Epix Stream» (Poppins × Lato, azul/rosa/negro/blanco) sobre las referencias del owner

- **Estado:** Aceptado
- **Fecha:** 2026-10-08
- **Decisores:** Fabian (owner) — dirección visual; Beru (director de diseño) — implementación
- **Reemplaza:** ADR-0008 (Open Design: Spotify × Runway, acento violeta `#6C4CF1`)

## Contexto y problema

El proyecto exige personalización de interfaz (`REQ-02`, `RF-04`) con una calidad visual
coherente y accesible (`RNF-05`: WCAG 2.2 AA) y un presupuesto de bundle acotado (`RNF-01`).
La identidad vigente (ADR-0008, Open Design: base *Spotify* × disciplina *Runway*, acento violeta
`#6C4CF1`) cumplía el objetivo de "contenido-primero", pero el owner solicitó un **cambio de
identidad visual** (solo visual, sin tocar arquitectura ni flujos) guiado por dos imágenes de
referencia propias, provistas directamente durante el rediseño (no versionadas en el repositorio).

Las referencias describen una **plataforma de streaming oscura con style guide explícito**:
tipografías **Poppins** (principal) + **Lato** (secundaria) y colores **azul** (primario),
**rosa** (secundario), **negro** (fondo) y **blanco** (texto). La decisión busca traducir ese
brief a un sistema de diseño versionable que reemplace la identidad anterior sin regresión de
accesibilidad ni de rendimiento.

## Impulsores de la decisión

- **Fidelidad al brief del owner:** el style guide explícito de las referencias es un requisito
  de dirección, no una sugerencia; la UI debe reflejarlo.
- **Contenido-primero en oscuro** (mantener el principio de ADR-0008): el póster de TVmaze manda,
  la UI se retira.
- **Accesibilidad** (`RNF-05`): contraste AA documentado con ratios, foco visible, touch targets
  ≥ 44 px — la nueva paleta debe sostenerlo, incluido el texto sobre superficies de póster.
- **Rendimiento** (`RNF-01`): la tipografía debe servirse sin penalizar el presupuesto
  (bundle inicial < 250 KB gzip); preferencia por fuentes autohospedadas y con `font-display`.
- **Consistencia y mantenibilidad:** tokens y reglas como fuente de verdad (`DESIGN.md` + CSS),
  sin deriva de criterio individual.

## Opciones consideradas

### Opción A — Conservar la identidad anterior (Open Design: Spotify × Runway, ADR-0008)

- **Pros:** cero costo de migración; coherencia con lo ya construido y probado.
- **Contras:** **no cumple el brief** — el owner pidió explícitamente azul/rosa/negro/blanco con
  Poppins × Lato; conservar el violeta `#6C4CF1` contradice la dirección visual solicitada.

### Opción B — Adoptar una librería de componentes (Material UI / shadcn)

- **Pros:** componentes listos y rápido de arrancar.
- **Contras:** estética de plantilla ("anti-slop"); mapear un style guide propio a un sistema
  ajeno exige pelear con el tema; sobrecarga de dependencias que tensiona `RNF-01`.

### Opción C — Adoptar las referencias del owner como sistema propio «Epix Stream» (elegida)

- **Pros:** fidelidad total al brief; identidad de marca deliberada (no plantilla); tokens y
  contrastes documentados como fuente de verdad; tipografía autohospedada (control del peso y
  del bundle).
- **Contras:** reescribir tokens, componentes y artefactos PWA (manifest, iconos, capturas);
  coste de migración de una sola vez; requiere juicio para no desvirtuar la accesibilidad del
  sistema anterior.

## Resultado de la decisión

Se eligió la **Opción C**, implementada como el sistema **«Epix Stream»** y fijada en
`docs/design/DESIGN.md` (reescrito) y `.open-design.json`
(`designSystem.slug: "epix-stream"`). El sistema define:

- **Tokens de color** remapeados en `src/index.css` (Tailwind 4 `@theme`), en dos temas:
  - **Azul primario** `#2563EB` para fills, CTA, chips y foco (blanco sobre él ≈ 5.2:1, AA).
    Azul de texto `#6EA8FF` (tema oscuro) / `#1D4ED8` (tema claro).
  - **Rosa** `#EC4899` (y `#DB2777` en claro) **solo para afecto** (corazón de favorito activo).
  - **Fondos** `#0B0B10` / `#14141B` (oscuro, tinte azul) y `#F6F7FB` (claro).
  - **Estrella de rating** `#FACC15` sobre «cristal oscuro» (badge con contraste estable
    independiente del póster de fondo).
- **Tipografía autohospedada** (6 archivos woff2, 78 KB total, `font-display: swap`, con
  precache del service worker verificado): **Poppins 500/600/700/800** (display y UI) +
  **Lato 400/700** (cuerpo). Nota: *Lato 500 no existe en Google Fonts*, por lo que no se incluye
  (documentado).
- **Reglas nuevas:**
  - *Stable Crystal*: badges con contraste estable sobre cualquier póster.
  - Rosa exclusivamente para afecto; navegación activa en azul.
  - Contraste AA documentado con tabla de ratios.
- **Artefactos regenerados:** `DESIGN.md`, `.open-design.json`, iconos PWA y capturas del
  manifest, manifest con `theme_color #2563EB` / `background_color #0B0B10`, capturas en
  `docs/evidencias/restyle/`.

La decisión reemplaza a ADR-0008, que queda como historial (no se reescribe en silencio).

## Consecuencias

### Positivas

- Identidad propia alineada al brief del owner (azul/rosa/negro/blanco, Poppins × Lato), sin
  perder el principio contenido-primero en oscuro.
- Accesibilidad sostenida con evidencia cuantitativa (tabla de ratios AA).
- Tipografía autohospedada: sin dependencia de red en runtime y sin penalizar el bundle
  (JS 170.75 KB < 250 KB; CSS 7.15 KB < 30 KB).

### Negativas / Riesgos

- Cambio de identidad de una sola vez: reescribir tokens, componentes y artefactos PWA implica
  retrabajo y riesgo de regresión visual en pantallas no cubiertas por la suite E2E.
- Impeccable reporta 2 hallazgos de `overused-font` (Lato): se asumen **justificados** porque el
  style guide explícito del owner manda (el brief tiene prioridad sobre la regla de auditoría);
  queda documentado para futuras revisiones.

### Deuda técnica asumida

- Los tokens viven en `DESIGN.md` (documentación) y en `src/index.css` (implementación) sin un
  generador que los sincronice (misma deuda de ADR-0008, ahora sobre la nueva paleta).
- **Verificación Lighthouse de producción pendiente**: los gates locales están en verde, pero la
  métrica de producción (perf/a11y) debe re-medirse tras el deploy correspondiente.

## Cumplimiento / Enlaces

- `docs/design/DESIGN.md`; `.open-design.json`.
- `src/index.css` (tokens `@theme`) y `src/presentation/` (componentes que consumen tokens).
- Referencias del owner: provistas directamente durante el rediseño (no versionadas en el repositorio).
- Evidencias: `docs/evidencias/restyle/` (6 capturas).
- Gates: lint, typecheck, 498 unit (cobertura 98.8 %), build, size-limit (JS/CSS), E2E 16/16.
- `docs/requisitos.md` (`REQ-02`/`RF-04`, `RNF-01`, `RNF-05`).
