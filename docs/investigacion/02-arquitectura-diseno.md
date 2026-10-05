# Investigación 02 — Arquitectura y diseño de aplicaciones móviles

> Documento de marco conceptual para Epix. Fuentes citadas en APA 7 (ver `docs/referencias.md`).

# Bloque A — Arquitectura interna de una app móvil

## 1. Componentes de una aplicación móvil

Toda app móvil puede descomponerse en componentes con responsabilidades distintas que cooperan
(Fowler, 2015). La **interfaz (UI)** presenta información y captura la interacción; la **lógica de
negocio** define las reglas que dan valor al producto (validaciones, cálculos, políticas); la **capa
de datos** gestiona acceso y persistencia; y los **servicios/APIs** conectan con recursos externos
(Android Developers, s. f.-a). Se suman los **componentes del sistema** —GPS, notificaciones,
cámara, almacenamiento— que deben consumirse tras abstracciones para no acoplar la app a la
plataforma, y la **gestión de estado**, que centraliza qué información está vigente y cómo cambia.
Esta división evita los "objetos dios" que mezclan renderizado, navegación y datos en una sola
pantalla.

## 2. Arquitectura por capas y separación de responsabilidades

El patrón *presentation–domain–data* separa tres capas: presentación (UI), lógica de dominio y
acceso a datos (Fowler, 2015). La presentación solo muestra y captura eventos; el dominio encapsula
reglas reutilizables mediante casos de uso; los datos exponen repositorios que envuelven fuentes
remotas y locales (Android Developers, s. f.-a). Aplicar **responsabilidad única a las capas**
significa que cada una tenga una sola razón para cambiar: si cambia el diseño visual, se toca
presentación; si cambia una regla, dominio; si cambia TVmaze, solo el repositorio. La **regla de
dependencia** (Clean Architecture) exige que las capas internas ignoren las externas: el dominio no
importa React.

## 3. Componentes reutilizables y sistema de diseño

Un sistema de diseño es el conjunto de *tokens* (color, tipografía, espaciado), componentes y reglas
que garantizan consistencia entre pantallas (Material Design, s. f.). Los componentes reutilizables
—tarjetas, botones, estados vacíos, indicadores de carga— se diseñan sin lógica de dominio y
parametrizables por propiedades, de modo que una misma tarjeta de serie sirva en inicio, búsqueda y
favoritos. Apple recuerda que consistencia y jerarquía clara reducen la carga cognitiva y hacen
predecible la interfaz (Apple, s. f.), y Material Design documenta patrones accesibles ya probados
que conviene reutilizar en lugar de reinventar.

## 4. Flujo de datos unidireccional (UDF)

En la UDF, el estado fluye hacia abajo y los eventos hacia arriba (Android Developers, s. f.-b). Con
MVVM: la UI emite un evento → el ViewModel o caso de uso lo procesa → el repositorio consulta la API
o la base de datos → el nuevo estado vuelve a la UI, que se re-renderiza. Un único origen de verdad
(*single source of truth*) evita copias divergentes y permite probar cada eslabón por separado.
Combinada con capas limpias, la UDF produce cinco ventajas: **mantenibilidad** (cambios
localizados), **escalabilidad** (módulos independientes), **testeabilidad** (lógica aislada de la
UI), **colaboración** (equipos por capa con contratos claros) y **seguridad** (validación
centralizada de datos).

# Bloque B — Diseño móvil y UX

## 5. Principios básicos de diseño móvil

La **jerarquía visual** guía la mirada con tamaño, contraste y posición; en móvil, una idea
principal por pantalla (Apple, s. f.). La **consistencia** usa los mismos patrones y convenciones de
plataforma para no obligar a reaprender (Nielsen, 1994). El **feedback** informa el estado del
sistema en tiempo razonable —spinners, *skeletons*, mensajes de éxito (Nielsen, 1994)— y las
**affordances táctiles** sugieren qué es pulsable mediante relieve, color o iconografía (Interaction
Design Foundation, s. f.). La **accesibilidad** exige objetivos táctiles de al menos 24 × 24 px
(W3C, 2024), aunque las guías de plataforma recomiendan 44 pt, además de contraste suficiente y
alternativas a los gestos (Apple, s. f.).

## 6. Wireframes

Un *wireframe* es una representación esquemática de la estructura y el flujo, sin detalle visual: la
"fidelidad" se mide en interactividad, visuales y contenido (Nielsen Norman Group, 2016). Los
niveles habituales son: boceto (papel), *wireframe* de baja fidelidad (estructura), *mockup*
(visual estático) y prototipo de alta fidelidad (navegable, cercano a la UI final). Sirven para
validar jerarquía, navegación y contenidos **antes** de invertir en desarrollo. No incluyen colores
definitivos, tipografías finales, imágenes reales, animaciones ni código; confundir fidelidad con
avance real es un error frecuente (Nielsen Norman Group, 2024).

## 7. Navegación entre pantallas

Los patrones comunes son: **stack** (apilar/retroceder en jerarquías), **barra inferior** (3 a 5
destinos de igual importancia, siempre visible; Material Design, s. f.), **modales** (tareas
acotadas que se completan o cancelan) y **deep linking** (abrir una pantalla concreta desde una URL
o notificación). Reglas prácticas: tabs para destinos raíz, stack para detalles, modal para filtros
o confirmaciones, y enlaces profundos con rutas como `/shows/:id` que el usuario pueda compartir y
el botón "atrás" respete (Apple, s. f.).

## 8. Diseño responsive y mobile-first

El diseño *responsive* combina rejillas flexibles, imágenes adaptables y *media queries* para
ajustarse a cualquier ancho; requiere la meta etiqueta de viewport para que el navegador móvil no
simule 980 px (web.dev, s. f.). El enfoque **mobile-first** diseña primero la pantalla pequeña (una
columna, jerarquía simple, contenido esencial) y luego añade *breakpoints* al crecer, minimizando
media queries y priorizando el rendimiento (MDN Web Docs, s. f.). En una PWA, esta base responsive
es también la que habilita uso cómodo en tablet y escritorio sin mantener dos productos distintos.

## 9. Experiencia de usuario (UX), heurísticas y pruebas

La UX comprende todo lo que el usuario percibe al interactuar: utilidad, facilidad, eficiencia y
satisfacción (Moran, 2019). Aplicadas a móvil, las heurísticas de Nielsen se traducen en: mostrar el
estado del sistema (cargas, conectividad), hablar el lenguaje del usuario, dar control y salida
(deshacer), ser consistente, prevenir errores (confirmaciones, validación), reconocer antes que
recordar, ofrecer atajos, diseño minimalista, errores claros y ayuda contextual (Nielsen, 1994). La
**prueba de usabilidad** observa a usuarios reales ejecutando tareas mientras el facilitador calla y
no induce; con 5 a 8 participantes cualitativos suelen detectarse los problemas principales (Moran,
2019).

---

## Aplicación al proyecto Epix

- **Pantallas y bottom navigation de 5 pestañas**: Inicio (trending), Buscar, Agenda, Favoritos,
  Historial; el detalle se abre en stack sobre la pestaña activa y los filtros como modal.
- **Componentes reutilizables**: `ShowCard`, `RatingBadge`, `SkeletonCard`, `EmptyState`,
  `ErrorBanner` y `BottomNav`, parametrizables por props y documentados como sistema de diseño con
  tokens CSS (color, espaciado, tipografía).
- **Flujo de datos UDF**: componente → hook/estado (ViewModel) → caso de uso → repositorio
  (`ShowRepository`, `FavoritesRepository`) → API TVmaze o IndexedDB; el estado regresa por
  props/observables, con origen único de verdad.
- **Deep linking y PWA**: rutas tipo `/shows/:id` compartibles, historial coherente con el botón
  atrás y service worker que cachea respuestas de TVmaze para modo offline.
- **Mobile-first y responsive**: una columna en móvil, rejilla multicolumna en tablet/escritorio,
  con `viewport` correcto y sin *scroll* horizontal.
- **Accesibilidad**: objetivos táctiles ≥ 44 px, contraste AA, navegación por teclado y etiquetas
  ARIA en pestañas, carruseles y buscador.
- **Validación UX**: pruebas con 5–8 usuarios sobre búsqueda y detalle, más evaluación heurística
  (feedback de carga, prevención de errores, consistencia y estados vacíos).
