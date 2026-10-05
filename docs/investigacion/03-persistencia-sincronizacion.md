# Investigación 03 — Persistencia, caché y sincronización

> Documento de marco conceptual para Epix. Fuentes citadas en APA 7 (ver `docs/referencias.md`).

## 1. Caché: concepto, capas y estrategias

Una caché es una copia temporal de datos que evita repetir trabajo de red (MDN Web Docs, 2026b).
Opera en capas: la caché HTTP (memoria y disco) del navegador, controlada con `Cache-Control`
(`max-age`, `no-cache`, `no-store`); la memoria, ultrarrápida pero volátil; el disco, persistente
entre sesiones; y Cache Storage, la caché gestionada del service worker, que no obedece cabeceras
HTTP ni expira por sí sola (MDN Web Docs, 2026a).

Las estrategias del service worker (Archibald, 2018; Chrome for Developers, s. f.-c) son:
**cache-first** (responde del caché y solo usa red si falta; ideal para recursos versionados),
**network-first** (busca red y cae al caché si falla; para API y HTML), **stale-while-revalidate**
(responde el caché al instante y revalida en segundo plano; para listados e imágenes),
**cache-only** (solo caché; para el app shell precacheado) y **network-only** (solo red; para pagos
y autenticación).

El TTL (time to live) define la vigencia: en HTTP se expresa con `max-age`/`Expires`; en Cache
Storage no existe expiración automática, por lo que Workbox ofrece `ExpirationPlugin` (`maxEntries`,
`maxAgeSeconds`) y se recomienda versionar cachés y purgar las antiguas en el evento `activate`
(Archibald, 2018; MDN Web Docs, 2026a). Invalidar es reemplazar o borrar entradas cuando el dato
deja de ser válido.

## 2. Datos temporales vs. persistentes

Los datos temporales duran poco o pueden reconstruirse (resultados de búsqueda, filtros, estado de
UI); los persistentes deben sobrevivir al cierre de la app (favoritos, historial, cola de
sincronización). El riesgo central es la *eviction*: el navegador elimina almacenamiento
best-effort bajo presión de disco con política LRU, y Safari borra datos de orígenes sin interacción
tras siete días (MDN Web Docs, 2026c; WHATWG, s. f.). También existen cuotas por origen (en
Chromium, hasta 60 % del disco) y errores `QuotaExceededError`. Criterio de decisión: ¿el dato es
reconstruible?, ¿su pérdida es crítica?, ¿es sensible? Si es irremplazable, se persiste y se
solicita `navigator.storage.persist()`; si es sensible (tokens), no debe quedar en almacenamiento
accesible por scripts.

## 3. Opciones de almacenamiento en el navegador

- **localStorage:** ~5 MiB, síncrono, solo cadenas; preferencias y tema simples. Bloquea el hilo
  principal.
- **sessionStorage:** ~5 MiB, síncrono, por pestaña; flujos temporales que mueren al cerrarla.
- **IndexedDB:** capacidad amplia según cuota, asíncrono, transaccional e indexado; entidades,
  historial y colas. Dexie simplifica su API.
- **Cache Storage:** cuota del origen, asíncrono, pares Request/Response; assets y respuestas GET
  de API (MDN Web Docs, 2026a).
- **Cookies:** ~4 KB, viajan en cada petición; sesión y autenticación con `HttpOnly`, `Secure` y
  `SameSite` (MDN Web Docs, 2026c).

## 4. Offline-first y Service Workers

Offline-first significa que la aplicación funciona sin red y sincroniza después; el service worker
actúa como proxy programable que intercepta `fetch` y decide cada respuesta (Archibald, 2018; W3C,
2025). El precaching descarga en `install` el app shell (HTML, JS, CSS) para arrancar offline; el
runtime caching registra rutas y estrategias para lo que se descubre durante el uso (Chrome for
Developers, s. f.-a). Workbox encapsula ambos con `precacheAndRoute`, `registerRoute` y plugins
como `ExpirationPlugin` y `BackgroundSyncPlugin`.

No es posible offline: escrituras que dependen del servidor, autenticación, pagos, datos nunca
descargados y contenido que exige red por política. La Background Sync API solo existe en
navegadores Chromium; en los demás, la cola se reintenta al iniciar el service worker (MDN Web
Docs, 2024).

## 5. Sincronización local ↔ base de datos

El patrón **outbox o cola de salida** escribe primero en local (IndexedDB) y encola la operación; un
worker la replica cuando vuelve la red (PowerSync, s. f.). Workbox `BackgroundSyncPlugin` guarda las
peticiones fallidas en IndexedDB y las reintenta al recibir el evento `sync`, con
`maxRetentionTime` (por ejemplo, 24 horas) y backoff gestionado por el navegador (Chrome for
Developers, s. f.-b). Para no duplicar al reintentar, cada operación lleva un identificador único
generado en el cliente y el servidor aplica upsert idempotente. Los conflictos se resuelven con
last-write-wins sobre `updated_at`, o con versionado optimista que detecta ediciones concurrentes y
permite fusionar o avisar (Supabase, 2024). La sincronización se dispara al evento `online`, al
abrir la app o vía Background Sync; Supabase Realtime (`postgres_changes`) notifica cambios remotos
(Supabase, 2024).

## 6. Tabla comparativa

| Técnica | Ventajas | Desventajas | ¿Cuándo usarla? |
| --- | --- | --- | --- |
| Cache-first | Máxima velocidad y offline | Sirve datos viejos sin versionado | Estáticos hasheados e imágenes |
| Network-first | Frescura con respaldo offline | Latencia si la red es lenta | APIs y HTML que cambian |
| Stale-while-revalidate | Respuesta instantánea y autoactualización | Entrega dato viejo una vez; siempre hay request | Listados, feeds y posters |
| Cache-only | Predecible y sin red | Nunca actualiza sin nuevo SW | App shell precacheado |
| Network-only | Siempre fresco | Falla offline | Auth, pagos, escrituras críticas |
| Outbox + Background Sync | No se pierden escrituras offline | Solo Chromium; más complejidad | Mutaciones de favoritos e historial |
| LWW + versionado | Resolución simple de conflictos | Puede perder ediciones concurrentes | Datos de un usuario, baja concurrencia |
| IndexedDB (Dexie) | Gran capacidad y consultas indexadas | API verbosa sin wrapper | Estado persistente local |

## 7. Design Tokens

Los design tokens son decisiones de diseño (color, tipografía, espaciado, radios) nombradas y
almacenadas como datos, con formato abierto JSON (W3C Design Tokens Community Group, 2025).
Ejemplos: `color.brand.primary = #6C4CF1`, `font.heading = Inter`, `space.md = 16px`. Aportan
consistencia porque constituyen una única fuente de verdad: eliminan valores mágicos, habilitan
temas claro/oscuro y accesibilidad, y sincronizan diseño y código con traductores como Style
Dictionary; por eso son la base de los design systems (Interaction Design Foundation, s. f.). En
CSS se implementan como custom properties (`--color-brand`, `--space-md`).

---

## Aplicación al proyecto Epix

- Favoritos e historial se persisten en IndexedDB (Dexie); la UI lee siempre local y nunca espera a
  la red.
- Las escrituras a Supabase viajan por un outbox en IndexedDB con UUID de cliente y upsert
  idempotente; `BackgroundSyncPlugin` en Chromium y re-sincronización al abrir la app como
  fallback.
- El historial es append-only (idempotencia natural por id de evento); los favoritos editables usan
  `updated_at` y versionado para LWW y detección de conflictos.
- API TVmaze (GET): network-first con fallback a caché para detalle y búsqueda;
  stale-while-revalidate para listados; cache-first con `ExpirationPlugin` (maxEntries,
  maxAgeSeconds) para imágenes.
- App shell y assets hasheados: precache en `install`, purga de cachés antiguas en `activate` y
  `navigator.storage.persist()` para proteger datos del usuario.
- No guardar tokens de sesión en localStorage; cookies `HttpOnly`/`Secure` o memoria. Design tokens
  como custom properties para tema claro/oscuro y espaciado consistente.
