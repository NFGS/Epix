# ADR-0002: Clean Architecture ligera por capas con puertos y adaptadores

- **Estado:** Aceptado
- **Fecha:** 2026-10-05
- **Decisores:** Fabian (arquitecto)

## Contexto y problema

El proyecto declara una regla de negocio explícita: **«el dominio no conoce frameworks; las
dependencias apuntan hacia adentro»** (`docs/requisitos.md` §4, `RN-02`). Sin una frontera
arquitectónica clara, una PWA que mezcla React, fetch, IndexedDB y Supabase tiende a acoplar
la lógica de negocio a detalles de infraestructura, volviendo cada cambio costoso y
dificultando las pruebas unitarias (objetivo `RNF-07`: cobertura ≥ 70 % en `domain/` y
`application/`).

La pregunta es **cuánta** arquitectura aplicar: una Clean Architecture "completa" (con
entidades, casos de uso, DTOs, mappers y marcos de inyección de dependencias) puede ser
sobreingeniería para un proyecto académico de un solo desarrollador; un enfoque "todo junto"
(vistas que hablan directo con `fetch` y `localStorage`) incumple `RN-02` y `RNF-08`
(escalabilidad: nuevas fuentes de datos sin reescribir la UI).

## Impulsores de la decisión

- **Testabilidad:** el dominio y la aplicación deben poder probarse sin React ni IndexedDB
  (`RNF-07`), usando dobles de los puertos.
- **Regla de dependencia verificable:** no basta con nombrar capas; debe haber un guard
  automatizado que impida violaciones.
- **Intercambiabilidad de adaptadores** (`RNF-08`): TVmaze, Dexie y Supabase deben ser
  reemplazables tras puertos estables del dominio.
- **Pragmatismo anti-sobreingeniería:** DDD "ligero", sin frameworks de DI ni orquestación de
  módulos compleja.
- **Convención del repo:** la estructura `src/{app,domain,application,infrastructure,presentation,shared}`
  ya está fijada en `AGENTS.md`.

## Opciones consideradas

### Opción A — Sin separación (vistas acopladas a infraestructura)

- **Pros:** mínimo boilerplate, entrega inmediata.
- **Contras:** incumple `RN-02`; los casos de uso (buscar, favoritear, sincronizar) quedan
  envenenados con `fetch`/`dexie`/`@supabase/*`; imposible cumplir `RNF-07`/`RNF-08`.

### Opción B — Clean Architecture estricta (DDD completo, módulos + DI)

- **Pros:** máxima decoupling formal; contratos exhaustivos.
- **Contras:** sobrecarga de abstracciones (DTOs, mappers por capa, contenedor DI) sin
  beneficio proporcional en un producto de este tamaño; frena la entrega en los incrementos.

### Opción C — Clean Architecture ligera por capas + puertos y adaptadores (elegida)

- **Pros:** regla de dependencia `presentation → application → domain` con `infrastructure`
  implementando puertos de `domain`; suficiente decoupling; bajo costo cognitivo; testable.
- **Contras:** algo de indirección (definir puertos) que no existiría en la Opción A; requiere
  disciplina para no filtrar tipos de framework en el dominio.

## Resultado de la decisión

Se adoptó la **Opción C**. La estructura en `src/` es:

```
app/ (router, providers, tema) → application/ (casos de uso) → domain/ (entidades y puertos)
                                     ▲
                        infrastructure/ (adaptadores: tvmaze, local, supabase, geo, sync)
presentation/ (pantallas, componentes, hooks)  ·  shared/ (tokens, utilidades)
```

El dominio no importa React, fetch, IndexedDB ni Supabase; los casos de uso (`application/use-cases/`,
p. ej. `toggle-favorite.ts`, `search-shows.ts`) dependen de puertos (`domain/ports/`), y los
adaptadores en `infrastructure/` los implementan.

La regla de dependencia se hace **cumplible de forma automática** con un guard de ESLint
`no-restricted-imports` en `eslint.config.js`: para `src/domain/**` y `src/application/**`
(excluyendo tests) prohíbe importar `react*`, `react-router-dom*`, `dexie*`,
`@supabase/*`, `@/presentation/*` y `@/infrastructure/*`. Cualquier violación rompe el gate
`pnpm lint` (`--max-warnings 0`). El guard quedó fijado en el commit `c869154`
(*fix: aplica correcciones de seguridad y revisión de código (CSP, capas, LWW, datos y a11y)*).

## Consecuencias

### Positivas

- `RNF-02`/`RN-02` verificados automáticamente por lint, no solo por revisión humana.
- Pruebas unitarias rápidas de dominio/aplicación sin DOM ni IndexedDB real (Vitest con
  `fake-indexeddb`), contribuyendo a `RNF-07`.
- Añadir una nueva fuente de datos (otra API o backend) no toca la UI (`RNF-08`).

### Negativas / Riesgos

- Indirección adicional: cada adaptador exige un puerto y un caso de uso orquestador.
- El guard no distingue "dependencia legítima" de "violación"; los tests quedan exentos
  (`ignores: ['**/*.test.ts']`) porque usan dobles.

### Deuda técnica asumida

- No hay herramienta de verificación de arquitectura a nivel de dependencias entre módulos
  (p. ej. `eslint-plugin-boundaries`); hoy el guard de imports cubre lo esencial.

## Cumplimiento / Enlaces

- `eslint.config.js` (bloque del guard de capas).
- `AGENTS.md` §Arquitectura; `SPEC.md` §5.
- `docs/requisitos.md` (`RN-02`, `RNF-07`, `RNF-08`).
- Puertos: `src/domain/ports/*.ts`; casos de uso: `src/application/use-cases/*.ts`.
