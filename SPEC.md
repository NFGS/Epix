# SPEC.md — Especificación del proyecto Epix

> Documento maestro: qué se construye, cómo se decide y cómo se verifica.
> Los requisitos detallados con criterios de aceptación están en [`docs/requisitos.md`](./docs/requisitos.md).

## 1. Resumen ejecutivo

Epix es una **PWA instalable** de series y televisión que consume la **API pública de TVmaze**
(CC BY-SA, sin API key). Ofrece búsqueda, detalle, agenda por país, favoritos, historial,
personalización, GPS, notificaciones locales y telemetría de uso sincronizada a **Supabase**.
Funciona **offline-first**: la UI lee siempre de la caché local (IndexedDB) y sincroniza en segundo plano.

## 2. Objetivos

| # | Objetivo | Métrica de éxito |
| --- | --- | --- |
| O1 | Consumir TVmaze de forma robusta | 0 errores no controlados; 429 manejado con backoff |
| O2 | Experiencia offline-first | App usable sin red (favoritos, historial, últimas búsquedas) |
| O3 | Personalización persistente | Preferencias sobreviven reinstalación de pestaña y se sincronizan |
| O4 | Evidencia académica completa | Matriz de trazabilidad + Notion + capturas + Postman |
| O5 | Calidad medible | Lighthouse PWA ≥ 90; lint/typecheck/tests en verde |

## 3. Alcance

**Dentro:** PWA móvil (responsive 360–430 px prioritario), modo standalone, offline,
5 secciones (Inicio/Buscar, Agenda, Favoritos, Historial, Perfil), telemetría opt-in.

**Fuera (por ahora):** autenticación con cuentas reales (se usa identidad anónima), push real
con servidor VAPID (se usan notificaciones locales), comentarios sociales, reproductor de video.

## 4. Requisitos obligatorios del instructor (macro)

| ID | Requisito | Incremento | Evidencia |
| --- | --- | --- | --- |
| REQ-01 | Consumo de la API de TVmaze | 2 | App funcionando + Postman + red |
| REQ-02 | Personalización UI y contenido, guardable y editable | 4 | Capturas antes/después + tabla `preferences` |
| REQ-03 | Uso del GPS del móvil | 5 | Captura del permiso + agenda del país detectado |
| REQ-04 | Uso de notificaciones | 6 | Captura de notificación en el dispositivo |
| REQ-05 | Telemetría a base de datos (fecha/hora, opciones, búsquedas) | 7 | Filas en Supabase + panel "Mi actividad" |
| REQ-06 | Caché, datos temporales/persistentes y sincronización | 3 | Documento + prueba offline + outbox |
| REQ-07 | Favoritos e historial (resultado de REQ-06) | 3 | Capturas + sync en Supabase |
| REQ-08 | PWA instalable (manifest + service worker) | 1–2 | Lighthouse + captura "Agregar a pantalla" |
| REQ-09 | Documentación y publicación (Notion + correo) | 1 | Enlace público de Notion |

## 5. Arquitectura objetivo

```
┌────────────────────────── Cliente PWA (React) ──────────────────────────┐
│ presentación (UI) → aplicación (casos de uso) → dominio (reglas)        │
│        ▲                    │                                           │
│        └── infrastructure ──┘                                           │
│   ├─ TVmazeRepository  (fetch + Zod + TanStack Query)                   │
│   ├─ LocalRepository   (Dexie: favoritos, historial, preferencias)      │
│   ├─ SyncEngine        (outbox + LWW + reintentos con backoff)          │
│   ├─ GeoService        (Geolocation + Nominatim reverse)                │
│   ├─ Notifications     (SW + Notification API)                          │
│   └─ TelemetryService  (eventos → outbox → Supabase)                    │
├─────────────────── Service Worker (Workbox) ────────────────────────────┤
│ precache app shell · network-first API · SWR listados · cache-first img │
└──────────────────────────────┬──────────────────────────────────────────┘
                               ▼
        Supabase (PostgreSQL + RLS): favorites · history · preferences
                                     usage_events · sync_cursors
```

**Estrategias de caché decididas:**

| Recurso | Estrategia | Motivo |
| --- | --- | --- |
| App shell (HTML/JS/CSS) | Precache (cache-first) | Arranque offline garantizado |
| API TVmaze (búsqueda/detalle) | Network-first + fallback | Frescura con resiliencia |
| Listados/últimas consultas | Stale-while-revalidate | Respuesta instantánea |
| Imágenes TVmaze | Cache-first + `ExpirationPlugin` | URLs inmutables; ahorro de datos |
| Escrituras (favoritos/telemetría) | Outbox + Background Sync | No perder operaciones offline |

## 6. Modelo de datos (resumen)

**Local (Dexie/IndexedDB):** `preferences` (tema, idioma, géneros, edad, país, flags),
`favorites` (+`syncStatus`), `history` (vistas), `searchHistory`, `outbox` (operaciones pendientes),
`syncMeta` (últimos cursores). Detalle en [`docs/modelo-datos.md`](./docs/modelo-datos.md) *(Fase 1)*.

**Externo (Supabase/PostgreSQL):** `profiles`, `preferences`, `favorites`, `watch_history`,
`usage_events`, `sync_cursors`, con **RLS** por `auth.uid()` y auth anónima por dispositivo.

## 7. Roadmap por incrementos

| Inc. | Nombre | Entrega |
| --- | --- | --- |
| 1 | Base | Scaffolding, tokens, layout, bottom navigation, componentes |
| 2 | API + caché | Cliente TVmaze (Zod), pantallas con estados, Workbox, offline |
| 3 | Persistencia + sync | Dexie, favoritos, historial, outbox, Supabase sync |
| 4 | Personalización | Onboarding/Perfil, filtros por edad y género, tema |
| 5 | GPS | Permiso → país → agenda local; fallback manual |
| 6 | Notificaciones | Permiso, recordatorio de episodios favoritos |
| 7 | Telemetría | Eventos, panel "Mi actividad", RLS en Supabase |
| 8 | Supabase | Migraciones SQL, políticas, guía de configuración |
| 9 | Calidad | Tests, capturas, Lighthouse, revisiones |

## 8. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Rate limit 429 de TVmaze | Datos no cargan | Debounce, caché, backoff, TanStack Query |
| Cuota/eviction del navegador | Pérdida de datos | IndexedDB + `navigator.storage.persist()` |
| iOS sin Periodic Sync/push | Notificaciones limitadas | Recordatorios al abrir la app; iOS 16.4+ instalada |
| Nominatim (política de uso) | GPS→país falla | Caché del país, selección manual, User-Agent propio |
| Fuga de credenciales | Seguridad | `.env` ignorado, solo anon key, RLS estricto |

## 9. Criterios de "terminado" (Definition of Done)

1. `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build` en verde.
2. Requisito demostrable con evidencia (captura, fila en BD, video o colección Postman).
3. Fila actualizada en la matriz de trazabilidad (`docs/requisitos.md` § Trazabilidad).
4. Documentación en Notion actualizada.
