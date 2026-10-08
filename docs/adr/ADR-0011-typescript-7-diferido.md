# ADR-0011 — Actualización a TypeScript 7 (diferida hasta el soporte de typescript-eslint)

- **Estado:** Aceptado (decisión: diferir; revisión ligada a un disparador externo)
- **Fecha:** 2026-10-07
- **Decisores:** Equipo Epix

## Contexto y problema

TypeScript 7 (compilador nativo) está disponible (7.0.2) y promete chequeos mucho más rápidos.
Se evaluó la migración dentro del backlog técnico. Se realizó un **intento real** en una rama de
trabajo con evidencia:

- `tsc -b` con TS 7: **exit 0, sin cambios de código ni de configuración**.
- `pnpm test:unit`, `pnpm build` y la suite E2E: **en verde** con TS 7.
- `pnpm lint`: **falla de forma no negociable** — `typescript-eslint@8.71.1` rechaza TS 7.0 con el
  error «typescript-eslint does not support TS 7.0» y remite al seguimiento
  [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940),
  cuyo soporte apunta a **TS ≥ 7.1**.

El pipeline de Epix exige `lint` con `--max-warnings 0` como gate bloqueante (CI + local), por lo
que no es viable aceptar una migración que lo rompe.

## Impulsores de la decisión

- Pipeline verde y reproducible (los 4 gates + Lighthouse CI son la red de seguridad del proyecto).
- La velocidad de `tsc` no es hoy un cuello de botella (el typecheck corre en ~1 s en local y CI).
- Coste cero y mínimo mantenimiento: evitar configuraciones frágiles de binarios duplicados.

## Opciones consideradas

1. **Actualizar a TypeScript 7 ahora.**
   - Pros: chequeo nativo más rápido (decenas de veces en proyectos grandes).
   - Contras: **lint roto** con la versión actual de typescript-eslint; sin solución dentro de la
     versión.
2. **Ejecución side-by-side (TS 6 para la API de ESLint + TS 7 para el chequeo).**
   - Pros: permitida oficialmente por el equipo de TS; conserva ambos mundos.
   - Contras: alias de binarios en `package.json`/pnpm, riesgo de colisiones del bin `tsc`,
     complejidad de mantenimiento sin beneficio medible hoy en Epix.
3. **Diferir hasta que typescript-eslint soporte TS ≥ 7.1.**
   - Pros: estabilidad del pipeline; migración ya validada como de bajo riesgo (el intento lo
     demostró: solo el lint bloquea).
   - Contras: se pospone la ganancia de velocidad del compilador nativo.

## Resultado de la decisión

**Opción 3 — Diferir.** Se mantiene `typescript@6.0.3`. La migración queda **pre-validada**: cuando
typescript-eslint publique soporte para TS ≥ 7.1, bastará actualizar `typescript`, re-ejecutar la
cadena completa de gates y publicar el cambio (sin tocar código, según la evidencia del intento).

**Disparador de revisión:** lanzamiento de typescript-eslint con soporte TS ≥ 7.1 (seguimiento en la
issue #10940) o cambio de estrategia del ecosistema.

## Consecuencias

- **Positivas:** pipeline estable hoy; decisión reversible y ya ensayada; Dependabot seguirá
  avisando de TS 7 (se rechazará con este ADR como contexto).
- **Negativas:** sin ganancia de velocidad nativa por ahora.
- **Riesgos:** que el ecosistema tarde más de lo previsto; mitigación: revisar la issue en cada
  mantenimiento trimestral.

## Revisiones

- **2026-10-08 — revisión de mantenimiento:** sin cambios en la decisión. La última versión
  publicada de `typescript-eslint` (**8.71.1**) sigue declarando el peer range
  `typescript >=4.8.4 <6.1.0`, y la versión estable más reciente de TS es `7.0.2`. El disparador
  (**soporte de TS ≥ 7.1 en typescript-eslint**) **no se ha cumplido**; se mantiene el
  diferimiento.

## Enlaces

- Anuncio TypeScript 7.0 y ejecución side-by-side con 6.0:
  https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- Seguimiento de soporte en typescript-eslint: https://github.com/typescript-eslint/typescript-eslint/issues/10940
- Evidencia del intento: `tsc -b` OK, unit/build/E2E OK, `lint` bloqueado (registro de la sesión).
