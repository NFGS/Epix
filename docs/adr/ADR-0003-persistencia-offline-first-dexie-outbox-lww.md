# ADR-0003: Persistencia offline-first con Dexie/IndexedDB + outbox + LWW

- **Estado:** Aceptado
- **Fecha:** 2026-10-06
- **Decisores:** Fabian (arquitecto)

## Contexto y problema

El curso exige caché, datos temporales/persistentes y sincronización (`REQ-06`), concretados
en favoritos e historial (`REQ-07`) y telemetría (`REQ-05`). La regla de negocio `RN-01`
impone: **«las operaciones de escritura offline nunca se pierden: primero local (IndexedDB),
luego nube»**. Esto obliga a un almacén local capaz de sobrevivir recargas, retener estructuras
complejas (arrays de géneros, snapshots de series) y ordenar una cola de operaciones pendientes.

El problema real es doble: (1) elegir un motor local con el balance correcto entre capacidad,
tamaño y ergonomía de consulta; y (2) diseñar una **sincronización bidireccional** que no
pierda datos al reconectar y que resuelva conflictos de forma determinista
(`RF-13`, `CA-13.1`: "upsert idempotente con id de cliente", "last-write-wins").

## Impulsores de la decisión

- **Supervivencia de datos** (`RN-01`, `RF-12`): favoritos/historial/preferencias deben
  persistir offline y entre sesiones.
- **Datos estructurados y consultables:** índices por `showId`, `addedAt`, `syncStatus`
  (`docs/modelo-datos.md` §1.1).
- **Cola de escritura fiable (outbox):** las operaciones de favoritos, historial y telemetría
  se encolan localmente y se reenvían con reintentos/backoff.
- **Resolución de conflictos determinista** (`CA-13.1`, `RNF-09`).
- **Sin dependencias que rompan el dominio:** el almacén es un detalle de infraestructura tras
  puertos (`domain/ports/*-repository.ts`).

## Opciones consideradas

### Opción A — `localStorage`

- **Pros:** trivial, síncrono, sin dependencias.
- **Contras:** solo strings, límite ~5–10 MB, sin índices ni transacciones, bloquea el hilo
  principal, se evapora al limpiar datos del navegador; insuficiente para snapshots de series
  y una cola outbox.

### Opción B — Redux Persist (serialización de estado en `localStorage`/`sessionStorage`)

- **Pros:** integra con estado global Redux.
- **Contras:** introduce Redux solo para persistir (el proyecto no usa Redux para estado);
  mismo techo de `localStorage`; mezcla "estado de UI" con "datos de dominio", violando el
  espíritu de `RN-02`; no resuelve outbox ni sincronización.

### Opción C — SQLite WASM (sql.js / wa-sqlite)

- **Pros:** SQL real, transacciones, potente.
- **Contras:** añade un binario WASM grande (~1–2 MB) que choca con el presupuesto de bundle
  (`RNF-01`, < 250 KB gzip); persistencia requiere serializar la BD entera a IndexedDB
  manualmente; sobreingeniería para el tamaño de datos actual.

### Opción D — Dexie sobre IndexedDB + patrón outbox + LWW (elegida)

- **Pros:** IndexedDB asíncrono y amplio (no 5 MB); Dexie aporta API tipada, índices y
  transacciones con cero dependencias de framework; ideal para favoritos/historial/preferencias
  y la cola `outbox`.
- **Contras:** API asíncrona (más verbosa que `localStorage`); requiere adaptadores por entidad.

## Resultado de la decisión

Se eligió la **Opción D**, materializada en `src/infrastructure/local/` (`db.ts` y
repositorios `favorites.repository.ts`, `history.repository.ts`, `outbox.repository.ts`,
`preferences.repository.ts`, `sync-meta.repository.ts`, `usage-events.repository.ts`).

El esquema Dexie (`db.ts`) define: `preferences` (key), `favorites` (`showId, addedAt,
syncStatus`), `history` (`++id, showId, type, occurredAt, syncStatus`), `searchHistory`,
`outbox` (`++id, opId, entity, status, createdAt`) y `syncMeta`. Las escrituras nunca van
directo a la nube: pasan por el `outbox` (`entity`, `operation: upsert|delete`, `payload`,
`attempts`, `status: pending|sent|failed`) y el `SyncEngine`
(`src/infrastructure/sync/sync-engine.ts`) las reenvía en orden al reconectar, con reintentos
y backoff y marcando `sent`/`failed`.

La resolución de conflictos es **last-write-wins determinista** en
`src/infrastructure/sync/merge-favorites.ts`: gana el `updatedAt` más reciente; a igualdad,
gana el `deletedAt` (tombstone) más reciente; si todo empata, gana el remoto. La decisión se
documentó en el commit `c146593` (*feat: agrega persistencia offline-first con favoritos,
historial y sincronización, fase 3 incremento 3*).

## Consecuencias

### Positivas

- Cumple `RN-01`/`RF-12`: la app es usable sin red (favoritos, historial, últimas búsquedas).
- Outbox + idempotencia (`upsert ... onConflict`) evitan duplicados al reconectar.
- LWW determinista elimina carreras no reproducibles (`CA-13.1`).
- Índices por `syncStatus` permiten listar solo lo pendiente de push.

### Negativas / Riesgos

- La copia de datos se mantiene en dos modelos (local Dexie y remoto Supabase), con el coste
  de mantener el mapeo y el merge consistentes.
- LWW puede "perder" una edición concurrente legítima en favor de la más reciente (aceptable
  para un usuario único por dispositivo; ver ADR-0004).
- `navigator.storage.persist()` mitiga pero no elimina la evicción del navegador
  (`SPEC.md` §8).

### Deuda técnica asumida

- No hay replicación por conflicto rico (CRDTs); si aparecieran múltiples dispositivos
  editando en paralelo, LWW debería reevaluarse.

## Cumplimiento / Enlaces

- `src/infrastructure/local/db.ts`, `outbox.repository.ts`, `sync-engine.ts`, `merge-favorites.ts`.
- `docs/modelo-datos.md` §1 y §3 (mapa de sincronización).
- `docs/requisitos.md` (`RF-07`, `RF-08`, `RF-12`, `RF-13`, `RN-01`).
