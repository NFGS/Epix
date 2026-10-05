# Glosario técnico — Desarrollo móvil y UX/UI

Términos clave del proyecto Epix, con definición sencilla, aplicación concreta y referencia.
Cada definición está redactada para entenderse sin experiencia previa.

## 1. Thumb Zone (zona del pulgar)

Región de la pantalla que un usuario alcanza cómodamente con el pulgar mientras sostiene el
teléfono con una mano. En pantallas grandes abarca la parte inferior y central; las esquinas
superiores son "zona difícil". **En Epix:** las acciones frecuentes (navegación, botón de
favorito, buscador) viven en la mitad inferior; lo destructivo o poco frecuente se ubica arriba
y protegido con confirmación.

> Referencia: Soegaard (2026); Material Design (s. f.).

## 2. Touch Target (área de toque)

Zona sensible al toque de un control interactivo (botón, ícono, fila). Debe medir al menos
**24 × 24 px CSS** (WCAG 2.2) y se recomiendan **44–48 px** para uso cómodo. **En Epix:** la
barra inferior, las tarjetas de series y los botones de favorito cumplen ≥ 44 px con separación
suficiente para evitar toques accidentales.

> Referencia: W3C (2024); Apple (s. f.).

## 3. Pull-to-Refresh (arrastrar para actualizar)

Gesto de arrastrar el contenido hacia abajo desde el borde superior para forzar la
actualización de datos. Es una convención aprendida en apps móviles. **En Epix:** disponible en
Inicio y Agenda; internamente invalida los queries de TanStack Query y respeta el rate limit
de TVmaze.

> Referencia: Android Developers (s. f.-b).

## 4. Swipe Back (deslizar para volver)

Gesto de deslizar desde el borde izquierdo para regresar a la pantalla anterior. En la web, el
equivalente del navegador móvil ya existe; la PWA debe respetar el historial (`history.pushState`)
para no romperlo. **En Epix:** el detalle de serie se abre con una ruta real (`/shows/:id`), por lo
que swipe back y botón atrás funcionan de forma nativa.

> Referencia: Apple (s. f.); MDN Web Docs (2026).

## 5. Pattern Bottom Navigation (barra de navegación inferior)

Patrón de navegación con 3–5 destinos principales siempre visibles en la parte inferior,
alcanzables con el pulgar. **En Epix:** cinco pestañas — Inicio, Buscar, Agenda, Favoritos,
Historial — con ícono + etiqueta y estado activo visible, más Perfil accesible desde el encabezado.

> Referencia: Material Design (s. f.).

## 6. Skeleton Screen (pantalla esquelética)

Marcador de posición gris que imita la estructura del contenido mientras carga, reduciendo la
percepción de espera y evitando saltos de diseño. **En Epix:** `SkeletonCard` reproduce la forma de
las tarjetas de series durante la búsqueda y la agenda; sustituye al spinner donde se conoce la forma del contenido.

> Referencia: Nielsen Norman Group (2024).

## 7. Spinner (indicador circular de carga)

Animación circular que indica que una operación está en curso. Útil cuando no se conoce la forma
del contenido o la espera es corta. **En Epix:** se usa en acciones puntuales (guardar preferencias,
sincronizar) y nunca en cargas de listas, donde se prefieren skeletons.

> Referencia: Nielsen (1994).

## 8. Hamburger Menu (menú hamburguesa)

Ícono de tres líneas que despliega un menú lateral u oculto. Oculta funcionalidad y baja la
descubribilidad; se recomienda solo para destinos secundarios. **En Epix:** se evita como
navegación principal (se usa bottom navigation); el ícono de Perfil usa un avatar directo, no
hamburguesa.

> Referencia: Nielsen (1994); Material Design (s. f.).

## 9. Offline First & Service Workers (enfoque offline en PWA)

Filosofía de diseño en la que la app funciona sin red y la conexión es una mejora, no un
requisito. El **service worker** es un proxy programable del navegador que intercepta las
peticiones y responde desde caché con estrategias definidas. **En Epix:** la UI lee siempre de
IndexedDB; el service worker precachea el app shell (cache-first), usa network-first para la API
y stale-while-revalidate para listados e imágenes.

> Referencia: Archibald (2018); MDN Web Docs (2025).

## 10. Design Tokens (tokens de diseño)

Decisiones de diseño (color, tipografía, espaciado, radios… ) nombradas y almacenadas como datos,
en lugar de valores repetidos ("colores mágicos"). Son la base de un sistema de diseño y permiten
temas claro/oscuro con un solo cambio. **En Epix:** `--color-brand`, `--space-md`, `--radius-lg`…
definidos como custom properties CSS y consumidos por todos los componentes.

> Referencia: W3C Design Tokens Community Group (2025); Interaction Design Foundation (s. f.).

---

## Términos complementarios del proyecto

| Término | Definición breve | Uso en Epix |
| --- | --- | --- |
| **PWA** | App web instalable con manifest, service worker y HTTPS | Epix es una PWA |
| **Manifest** | Archivo JSON con nombre, iconos y `start_url` de la app | `manifest.webmanifest` generado por `vite-plugin-pwa` |
| **IndexedDB / Dexie** | Base de datos del navegador, asíncrona y con índices | Favoritos, historial, preferencias, outbox |
| **Workbox** | Librería que simplifica service workers y estrategias de caché | Configuración vía `vite-plugin-pwa` |
| **Outbox (cola de salida)** | Lista local de operaciones pendientes por enviar al servidor | Favoritos y telemetría offline |
| **TTL** | Tiempo de vida de un dato en caché antes de considerarse vencido | Imágenes y API (`ExpirationPlugin`) |
| **Backoff exponencial** | Reintentar con esperas cada vez mayores tras fallos | Reintentos de sync y respuesta al `429` de TVmaze |
| **Last-write-wins (LWW)** | Resolución de conflictos: gana la escritura más reciente | Sincronización de favoritos/preferencias |
| **Deep link** | Enlace que abre una pantalla concreta de la app | `/shows/:id` desde notificaciones |
| **Flujo unidireccional (UDF)** | Los datos bajan por capas y los eventos suben | UI → caso de uso → repositorio → datos |
