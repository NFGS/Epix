# ADR-0006: Contratos con Zod en todos los límites + `z.config({ jitless: true })`

- **Estado:** Aceptado
- **Fecha:** 2026-10-06
- **Decisores:** Fabian (arquitecto)

## Contexto y problema

TVmaze es una API pública **sin API key** cuyo JSON no está versionado formalmente
(`AGENTS.md` §Reglas TVmaze). La regla `RN-03` obliga a que **toda salida externa se valide
con Zod antes de entrar al dominio**. Sin validación, un cambio silencioso de la API
(campos nulos, tipos distintos) se propagaría hasta la UI como errores no controlados,
incumpliendo el objetivo O1 (`SPEC.md` §2: "0 errores no controlados").

El segundo problema aparece al **endurecer la CSP** (ADR-0007): Zod 4 usa por defecto una
compilación *just-in-time* de los schemas mediante `new Function(...)`, lo que bajo una CSP
estricta sin `'unsafe-eval'` dispara una violación reportada por Chrome
(`securitypolicyviolation` en el panel de Issues) **aunque el error se capture**. Esto contamina
la auditoría de seguridad y obliga a elegir entre relajar la CSP o desactivar la JIT.

## Impulsores de la decisión

- **Integridad de contratos** en todo límite externo (`RN-03`, `RNF-02`).
- **CSP estricta sin `'unsafe-eval'`** (ADR-0007): no se debe relajar por una dependencia.
- **Compatibilidad con el bundle:** la validación no debe añadir peso significativo
  (`RNF-01`).
- **Verificabilidad:** schemas tipados y unit-testeados.

## Opciones consideradas

### Opción A — Validación manual (guards a mano / `as unknown as T`)

- **Pros:** sin dependencias.
- **Contras:** propenso a errores, verboso, no reutilizable; incumple `RN-03` en la práctica;
  el `as` ocultaría los cambios de la API.

### Opción B — Zod con JIT habilitada (default) y `'unsafe-eval'` en la CSP

- **Pros:** máxima velocidad de validación de Zod 4.
- **Contras:** introduce `'unsafe-eval'` en `script-src`, debilitando la CSP y disparando
  hallazgos de auditoría; inaceptable dado el objetivo de seguridad sin hallazgos críticos.

### Opción C — Zod en todos los límites + `z.config({ jitless: true })` (elegida)

- **Pros:** validación tipada y reutilizable en todos los límites (TVmaze y pull de Supabase);
  sin `new Function`, por lo que la CSP puede mantenerse estricta.
- **Contras:** la validación interpretada (jitless) es algo más lenta que la JIT; hay que
  garantizar que el módulo que desactiva la JIT se importe **antes** de crear/parsear esquemas.

## Resultado de la decisión

Se eligió la **Opción C**. Los contratos se centralizan en esquemas Zod:

- `src/infrastructure/tvmaze/schemas.ts` valida la respuesta de TVmaze; el cliente
  (`src/infrastructure/tvmaze/client.ts`) hace `schema.safeParse(payload)` y lanza
  `TvmazeHttpError` con mensaje claro si el contrato falla.
- `src/infrastructure/supabase/supabase-sync.adapter.ts` valida cada fila del *pull* remoto
  con `favoritePullRowSchema` y **omite filas corruptas** (R-04) en vez de romper la sync.

Para la CSP, `src/shared/lib/zod-jitless.ts` ejecuta `z.config({ jitless: true })` con un
comentario que documenta el hallazgo: Zod 4 (`node_modules/zod/v4/core/util.js`) advierte que
bajo CSP estricta la sonda de capacidades `new Function` se reporta como violación incluso
capturada. El módulo se importa como **primera línea** de `src/main.tsx`
(`import '@/shared/lib/zod-jitless'`) para que surta efecto antes de parsear cualquier schema.

La decisión se materializó en el commit `36f92d6` (*fix: desactiva la JIT de Zod (elimina la
violación de CSP sin unsafe-eval) y retira los sourcemaps*) y se reflejó en `CHANGELOG.md`.

## Consecuencias

### Positivas

- `RN-03` cumplido: ninguna respuesta externa entra al dominio sin validación.
- CSP estricta mantenida sin `'unsafe-eval'` (ADR-0007), con auditoría limpia.
- Mensajes de error explícitos ("La respuesta de TVmaze no cumple el contrato esperado").

### Negativas / Riesgos

- Rendimiento de validación ligeramente inferior (interpretado vs. JIT); irrelevante para el
  volumen de datos de una app de catálogo.
- Orden de imports frágil: si otro módulo importa y usa Zod antes de `zod-jitless`, la JIT
  podría quedar activa y reaparecer la violación.

### Deuda técnica asumida

- El contrato de TVmaze está acoplado a la forma actual de la API; si TVmaze cambia el JSON,
  hay que actualizar los schemas (mitigado por tests unitarios en `schemas.test.ts`).

## Cumplimiento / Enlaces

- `src/shared/lib/zod-jitless.ts`; `src/main.tsx`.
- `src/infrastructure/tvmaze/{client,schemas}.ts`; `src/infrastructure/supabase/supabase-sync.adapter.ts`.
- `docs/requisitos.md` (`RN-03`, `RNF-02`); `CHANGELOG.md` (Security).
