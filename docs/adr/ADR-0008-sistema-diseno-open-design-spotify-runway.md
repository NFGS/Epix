# ADR-0008: Sistema de diseño propio adoptado de Open Design (Spotify × Runway)

- **Estado:** Aceptado
- **Fecha:** 2026-10-05
- **Decisores:** Fabian (arquitecto)

## Contexto y problema

El proyecto exige personalización de interfaz (`REQ-02`, `RF-04`) y una calidad visual
coherente y accesible (`RNF-05`: WCAG 2.2 AA). Para una PWA de series y TV, la interfaz debe
ser **contenido-primero**: los pósters de TVmaze son la fuente de color, y la UI debe retirarse
para no competir con ellos. Partir de cero (definir tokens, tipografía, componentes y estados
desde cero) tiene un costo alto y riesgo de incoherencia; usar una librería de componentes
genérica (Material/Tailwind UI) tiende a producir interfaces "plantilla" y a introducir
indigos por defecto que chocan con una identidad propia.

La decisión busca una **base de diseño probada** con una **identidad de marca deliberada**, y
que quede fijada como fuente de verdad versionable en el repo.

## Impulsores de la decisión

- **Contenido-primero en oscuro:** inmersión cinematográfica; el póster manda, no la UI.
- **Identidad propia:** un acento de marca Epix (`#6C4CF1`) distinto de los colores por defecto
  de frameworks.
- **Accesibilidad** (`RNF-05`): contraste AA, touch targets ≥ 44 px, foco visible.
- **Consistencia y velocidad de desarrollo:** tokens y componentes documentados como fuente de
  verdad.
- **Anti-slop:** evitar el "aspecto IA genérico" con reglas explícitas.

## Opciones consideradas

### Opción A — Librería de componentes (Material UI / shadcn/Tailwind UI)

- **Pros:** componentes listos, rápido de arrancar.
- **Contras:** estética de plantilla; difícil de personalizar sin pelear con el tema; riesgo de
  indigos por defecto y de sobrecarga de dependencias que pesan en el bundle (`RNF-01`).

### Opción B — Diseño propio desde cero

- **Pros:** control absoluto.
- **Contras:** alto costo inicial (tokens, escala tipográfica, estados, a11y); riesgo de
  incoherencia por falta de una disciplina previa.

### Opción C — Open Design: base *Spotify* × disciplina *Runway* + override de marca (elegida)

- **Pros:** parte de un design system probado (Spotify: oscuro contenido-primero, geometría
  pill/círculo) y le aplica una disciplina editorial (Runway: UI invisible, labels uppercase);
  override deliberado del acento; documentado y versionable.
- **Contras:** requiere adaptación (no es "copiar y pegar"); hay que traducir los principios a
  tokens y specs propias.

## Resultado de la decisión

Se eligió la **Opción C**, fijada en `docs/design/DESIGN.md` y en el manifiesto
`.open-design.json` (`designSystem.slug: "spotify"`, notas del override). El sistema define:

- **Tokens de color** en dos temas (oscuro por defecto `--bg #0E0D13`, claro), con el acento
  Epix `#6C4CF1` y sus variantes (`--accent-hover`, `--accent-soft`, `--accent-text #B9A5FF`).
  Los contrastes se documentan con ratios (p. ej. `--fg` sobre `--bg` ≈ 15:1; `--accent-text`
  8.9:1).
- **Tipografía** de sistema (offline-first, sin fuentes web), binarismo de peso 700/400 y
  escala compacta de app.
- **Geometría y elevación:** pills 9999px, tarjetas 12px, sombras fuertes en oscuro + bordes
  semi-transparentes; único gradiente permitido (scrim de póster).
- **Componentes spec** (ShowCard, BottomNav, SearchInput, botones, chips, skeleton, EmptyState,
  ErrorState, OfflineBanner).
- **5 estados obligatorios** por superficie (loading/empty/error/populated/edge) y reglas de
  **movimiento** (150 ms default, `prefers-reduced-motion`).
- **Accesibilidad WCAG 2.2 AA** y un **checklist anti-slop** (cero indigos por defecto, cero
  emojis como iconos, máximo 2 usos visibles del acento por pantalla).

La decisión quedó documentada en el commit `fbc79ca` (*docs(design): fija el sistema de diseño
de Epix (Open Design: spotify x runway)*).

## Consecuencias

### Positivas

- Identidad visual propia (acento violeta) con disciplina editorial clara.
- Coherencia garantizada por tokens + specs, no por criterio individual.
- Accesibilidad y anti-slop verificables contra el checklist.

### Negativas / Riesgos

- Mantener dos temas y 5 estados por superficie aumenta el trabajo de UI frente a una librería
  lista.
- La adaptación de un sistema ajeno exige juicio para no desvirtuar la base.

### Deuda técnica asumida

- Los tokens viven como documentación (`DESIGN.md`) más la implementación en CSS; no hay un
  generador automático que sincronice ambos (riesgo de deriva doc↔código).

## Cumplimiento / Enlaces

- `docs/design/DESIGN.md`; `.open-design.json`.
- `src/index.css` (tokens) y `src/presentation/` (componentes que consumen tokens).
- `docs/requisitos.md` (`RF-04`, `RNF-05`); `README.md` §Stack.
