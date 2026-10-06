# Evidencias — Epix (fase 3)

Capturas generadas con Chromium real (Playwright) contra el build de producción
(`pnpm build && pnpm preview`), viewport móvil 390×844 en tema oscuro.

## Capturas de la aplicación (`capturas/`)

| Archivo | Qué evidencia |
| --- | --- |
| `01-inicio.png` | Inicio «Hoy en TV» con país por región, CTA y atribución TVmaze (CC BY-SA) |
| `02-buscar-resultados.png` | Búsqueda real en TVmaze («girls» → 10 resultados) con pósters, rating y filtros |
| `03-detalle.png` | Detalle de serie con hero, metadatos, sinopsis y episodios |
| `04-detalle-favorito.png` | Corazón de favoritos activado (RF-07) |
| `05-agenda.png` | Agenda por país con selector y estados propios |
| `06-favoritos.png` | Lista de favoritos offline-first (IndexedDB) |
| `07-historial.png` | Historial de vistas y búsquedas |
| `08-perfil.png` | Perfil: tema, idioma, filtros de contenido, ubicación, notificaciones y telemetría |
| `09-mi-actividad.png` | Telemetría opt-in: eventos con fecha/hora y búsquedas registradas (RF-11) |
| `10-diagrama-arquitectura.png` | Diagrama Archify: arquitectura offline-first del cliente |
| `11-diagrama-sync.png` | Diagrama Archify: secuencia de favorito offline → sincronización |
| `lighthouse-inicio.json` | Informe Lighthouse (Inicio, local): rendimiento 88 · accesibilidad 100 · buenas prácticas 100 |
| `lighthouse-produccion.json` | Informe Lighthouse de **producción** ([epix-xi.vercel.app](https://epix-xi.vercel.app)): rendimiento 86 · accesibilidad 100 · buenas prácticas 100, sin violaciones de CSP |
| `12-produccion-inicio.png` | Producción real ([epix-xi.vercel.app](https://epix-xi.vercel.app)): inicio con SW activo |
| `13-produccion-deeplink.png` | Deep link directo en producción (`/shows/169`) renderizando con datos reales de TVmaze |

> La revisión visual de los dos diagramas (legibilidad en desktop y móvil) fue realizada sobre
> estas capturas: tipografía legible, sin recortes ni cruces problemáticos; no requirieron reparación.

## Regenerar

```bash
pnpm build && pnpm preview --port 4173     # servidor de producción
# requiere playwright-core + Chromium (usa el del sistema o ~/.cache/ms-playwright)
node docs/evidencias/capturar.mjs
node docs/evidencias/verify-prod.mjs   # verifica la URL de producción (HTTP, SW, deep links)
```

## Calidad automatizada (completada)

- **E2E formal:** suite Playwright con 12 pruebas (navegación, búsqueda/detalle, favoritos/historial
  persistentes, modo offline con service worker y personalización) — `pnpm test:e2e`, API mockeada.
- **Auditoría de seguridad:** 0 hallazgos críticos/altos; endurecimientos aplicados (CSP, validación
  de origen en SW, retención de outbox, LWW determinista, foco en diálogos).
- **Accesibilidad:** Lighthouse 100 en Inicio.

## Pendientes de evidencia (dispositivo físico)

- Capturas en **Android físico** (instalación, notificación, GPS): seguir
  [`docs/entrega/guia-verificacion-movil.md`](../entrega/guia-verificacion-movil.md) y guardar en
  `capturas-android/`.
- Sincronización multi-dispositivo: requiere cuentas reales (hoy cada dispositivo usa una identidad
  anónima propia).
