# ADR-0007: CSP como header HTTP en Vercel (no `<meta>`)

- **Estado:** Aceptado
- **Fecha:** 2026-10-06
- **Decisores:** Fabian (arquitecto)

## Contexto y problema

La app debe exponer una **Content-Security-Policy** estricta como parte del endurecimiento de
seguridad (`RNF-02`, auditoría OWASP). Hay dos mecanismos para declarar una CSP: la etiqueta
`<meta http-equiv="Content-Security-Policy">` en el HTML o el **header HTTP**
`Content-Security-Policy`. Ambos no son equivalentes y la elección tiene consecuencias
funcionales y de seguridad.

En particular, ciertas directivas **no se pueden declarar en `<meta>`** —entre ellas
`frame-ancestors`, `report-uri` y `sandbox`— y las que sí se permiten pierden cobertura de
comportamientos previos al parseo del HTML. Además, una CSP en `<meta>` dispara avisos en el
panel de Issues de Chrome (por ejemplo al intentar usar `frame-ancestors`), lo que ensucia la
evidencia de auditoría.

## Impulsores de la decisión

- **Seguridad completa** (`RNF-02`): necesitamos `frame-ancestors 'none'` para prevenir
  clickjacking, directiva **no soportada** en `<meta>`.
- **Auditoría limpia:** evitar issues de Chrome y violaciones fantasma.
- **Control centralizado** de headers en el edge (Vercel) sin tocar el HTML de cada build.
- **Otros headers de endurecimiento:** `X-Content-Type-Options: nosniff` y `Referrer-Policy`.

## Opciones consideradas

### Opción A — CSP en `<meta http-equiv>` del `index.html`

- **Pros:** trivial de editar; funciona sin depender del proveedor de hosting.
- **Contras:** `frame-ancestors` es inválido en `<meta>` (Chrome lo reporta en Issues); no
  cubre recursos servidos antes del parseo; duplica la política si además hay header;
  mezcla la política de seguridad con el contenido HTML.

### Opción B — CSP como header HTTP en Vercel (elegida)

- **Pros:** `frame-ancestors 'none'` válido; cobertura desde el primer byte; centralizado en
  `vercel.json`; permite afinar además headers de caché por recurso.
- **Contras:** depende del soporte de `headers` del proveedor; no aplica en `pnpm dev` local
  (donde la CSP se valida en producción/E2E).

## Resultado de la decisión

Se eligió la **Opción B**. En `vercel.json` se declara, para `/(.*)`, el header:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://static.tvmaze.com https://*.tvmaze.com data: blob:;
  connect-src 'self' https://api.tvmaze.com https://nominatim.openstreetmap.org
    https://*.supabase.co wss://*.supabase.co;
  font-src 'self' data:;
  object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
  worker-src 'self' blob:; manifest-src 'self'
```

junto con `X-Content-Type-Options: nosniff` y `Referrer-Policy: strict-origin-when-cross-origin`.
La CSP permite únicamente los orígenes estrictamente necesarios (TVmaze, Nominatim para la
geocodificación inversa del GPS, Supabase REST/Realtime), mantiene `script-src 'self'` sin
`'unsafe-eval'` (posible gracias al `jitless` de Zod, ADR-0006) y fija `frame-ancestors 'none'`.

El mismo `vercel.json` añade headers de caché diferenciados: `no-cache, no-store,
must-revalidate` para `/sw.js`, `no-cache` para `/registerSW.js` y `/manifest.webmanifest`, e
`immutable` (1 año) para `/assets/*`. La decisión quedó registrada en el commit `654b121`
(*fix: mueve el CSP a header HTTP en Vercel, genera sourcemaps y sincroniza el lockfile para
el CI*).

## Consecuencias

### Positivas

- `frame-ancestors 'none'` efectivo (anti-clickjacking) sin issues de Chrome.
- CSP centralizada y auditable en `vercel.json`; sin `'unsafe-eval'`.
- Headers de caché correctos para SW/manifest (frescura) y assets (inmutabilidad).

### Negativas / Riesgos

- La CSP solo se aplica en producción/Vercel, no en desarrollo local; hay que verificarla en
  el deploy (`docs/evidencias/verify-prod.mjs`, Lighthouse).
- Cualquier nuevo origen (futuras APIs, proveedor de analítica) debe añadirse manualmente a la
  CSP o se bloqueará silenciosamente.

### Deuda técnica asumida

- No hay `report-uri`/`report-to` configurado aún, por lo que las violaciones reales de CSP no
  se telemetrean a un endpoint.

## Cumplimiento / Enlaces

- `vercel.json` (bloque `headers`).
- `CHANGELOG.md` (Security); `docs/requisitos.md` (`RNF-02`).
- Verificación: `docs/evidencias/verify-prod.mjs` y `lighthouse-produccion.json`.
