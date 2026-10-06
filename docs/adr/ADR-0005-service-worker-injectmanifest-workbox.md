# ADR-0005: Service worker propio con `injectManifest` + Workbox

- **Estado:** Aceptado
- **Fecha:** 2026-10-06
- **Decisores:** Fabian (arquitecto)

## Contexto y problema

Epix debe funcionar offline (`RF-12`) y ser instalable (`RF-14`). Eso exige un service worker
que (a) precachee el app shell, (b) sirva la API de TVmaze con resiliencia ante caídas o
`429`, (c) cachee imágenes, y (d) maneje el `notificationclick` para abrir el detalle de una
serie (deep link `/shows/:id`, `CA-10.1`).

`vite-plugin-pwa` ofrece dos estrategias de generación del SW: **`generateSW`** (Workbox se
autoconfigura desde opciones declarativas) e **`injectManifest`** (nosotros escribimos el SW a
mano y Workbox solo inyecta el manifiesto de precache). La decisión define cuánto control
tenemos sobre el comportamiento del SW y cuánta lógica propia (deep links, validación de URL)
podemos incluir.

## Impulsores de la decisión

- **Estrategias de caché específicas** (`SPEC.md` §5): precache del shell, `NetworkFirst` para
  la API, `CacheFirst` para imágenes.
- **`notificationclick` con deep link** y validación de origen (no abrir URLs arbitrarias).
- **Seguridad:** validar que la URL del deep link es interna antes de abrirla.
- **Caché del SW no cacheados:** `sw.js` debe servirse sin caché para que las actualizaciones
  lleguen de inmediato (`vercel.json`).

## Opciones consideradas

### Opción A — `generateSW` (configuración declarativa)

- **Pros:** mínimo código; Workbox genera el SW con `navigateFallback`, `runtimeCaching` y
  precache automáticos.
- **Contras:** no permite insertar lógica propia de `notificationclick` con validación de URL
  de forma directa; menos control sobre el orden de los `registerRoute` y sobre el fallback
  SPA; acopla el comportamiento a lo que la opción expone.

### Opción B — `injectManifest` con un `sw.ts` propio (elegida)

- **Pros:** control total del SW (rutas, estrategias, `skipWaiting`/`clientsClaim`,
  `notificationclick`); Workbox sigue inyectando `self.__WB_MANIFEST` para el precache.
- **Contras:** hay que escribir y mantener el SW; requiere entender Workbox de bajo nivel.

## Resultado de la decisión

Se eligió la **Opción B**. En `vite.config.ts` se fija `strategies: 'injectManifest'`,
`srcDir: 'src'`, `filename: 'sw.ts'` e `injectManifest.globPatterns` para el precache del
shell. El SW se implementa en `src/sw.ts`:

- `self.skipWaiting()` + `clientsClaim()` para activar actualizaciones sin recargar.
- `precacheAndRoute(self.__WB_MANIFEST)` + `cleanupOutdatedCaches()`.
- Fallback SPA con `NavigationRoute(createHandlerBoundToURL('index.html'))`.
- `registerRoute` de la API (`/^https:\/\/api\.tvmaze\.com\/.*/i`) con `NetworkFirst`
  (`networkTimeoutSeconds: 8`, `CacheableResponsePlugin({ statuses: [0,200] })`,
  `ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 86400 })`).
- Imágenes (`static.tvmaze.com` y `/uploads/images/`) con `CacheFirst` +
  `ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 30 días })`.
- `notificationclick`: cierra la notificación, extrae `data.url`, la valida con
  `isInternalUrl` (si no es interna usa `/`) y hace `focusOrOpen` (foco a pestaña existente o
  `openWindow`), enviando `postMessage({ type: 'navigate', url })` para el deep link.

La decisión se introdujo junto a la integración de la API en el commit `4aba902` (*feat:
integra TVmaze con contratos Zod, caché Workbox y UI real*).

## Consecuencias

### Positivas

- Offline real verificado: shell precacheado + API con fallback + imágenes cacheadas
  (`RF-12`, Lighthouse).
- Deep link seguro a `/shows/:id` desde la notificación (`CA-10.1`).
- Control fino del TTL y del número de entradas por caché (ahorro de datos).

### Negativas / Riesgos

- El SW es código de producción que hay que mantener y probar (no lo cubre la suite unit de
  dominio/aplicación; se verifica vía E2E y Lighthouse).
- `NetworkFirst` con timeout de 8 s puede añadir latencia percibida en redes lentas (mitigado
  por TanStack Query en memoria y SWR para listados).

### Deuda técnica asumida

- No se usa `Background Sync` del SW para el outbox; la sincronización se dispara por evento
  `online`/apertura/acción manual desde la capa de aplicación (ver ADR-0003).

## Cumplimiento / Enlaces

- `src/sw.ts`; `vite.config.ts` (bloque `VitePWA`).
- `vercel.json` (headers `Cache-Control: no-cache` para `/sw.js` y `/registerSW.js`).
- `SPEC.md` §5 (estrategias de caché); `docs/requisitos.md` (`RF-12`, `RF-14`, `CA-10.1`).
