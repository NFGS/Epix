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

> La revisión visual de los dos diagramas (legibilidad en desktop y móvil) fue realizada sobre
> estas capturas: tipografía legible, sin recortes ni cruces problemáticos; no requirieron reparación.

## Regenerar

```bash
pnpm build && pnpm preview --port 4173     # servidor de producción
# requiere playwright-core + Chromium (usa el del sistema o ~/.cache/ms-playwright)
node docs/evidencias/capturar.mjs
```

## Pendientes de evidencia (siguiente iteración)

- Suite E2E formal con `@playwright/test` (hoy: pruebas unitarias + verificación manual asistida).
- Auditoría Lighthouse completa con informe PDF (se ejecutó la corrida automática; ver resumen en el historial del proyecto).
- Captura de la app **instalada** en Android y de una **notificación** en el dispositivo real.
