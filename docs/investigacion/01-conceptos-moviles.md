# Investigación 01 — Aplicaciones móviles, PWAs y el rol del cliente

> Documento de marco conceptual para Epix. Fuentes citadas en APA 7 (ver `docs/referencias.md`).

## 1. Qué es una aplicación móvil

Una aplicación móvil es un programa informático diseñado para ejecutarse en dispositivos de mano
—teléfonos inteligentes, tabletas o relojes inteligentes— y cuya interfaz se adapta a pantallas
pequeñas, entrada táctil y sesiones breves de uso en movimiento (Budiu, 2013). Su diseño no es una
versión reducida del escritorio: el usuario suele operar con una sola mano, en contextos de
distracción y con atención fragmentada, por lo que se recomienda una acción primaria por pantalla,
objetivos táctiles amplios y minimizar la escritura (Soegaard, 2026). Estas restricciones convierten
el contexto de uso —movilidad, interrupciones y conectividad intermitente— en parte central del
problema de diseño, no en un detalle accesorio (Soegaard, 2026).

## 2. Diferencia entre aplicación web y aplicación móvil

Una aplicación web se ejecuta en el navegador y se accede mediante una URL; una aplicación móvil
nativa se instala desde una tienda, reside en el dispositivo y puede explotar todos sus sensores
(Budiu, 2013). La web ofrece descubribilidad por buscadores, acceso inmediato sin instalación,
independencia de plataforma, actualización instantánea y ninguna aprobación ni comisión de tiendas;
a cambio, su acceso al hardware es limitado, su funcionamiento sin conexión es más restringido y su
integración con el sistema operativo es menor (Budiu, 2013). La aplicación nativa gana en
rendimiento, gestos, notificaciones y operación offline, pero exige desarrollo y mantenimiento por
plataforma, que el usuario la instale y someterse a las políticas y tarifas de las tiendas de
aplicaciones (Budiu, 2013). Esa brecha se ha estrechado con las capacidades modernas de la web
(MDN Web Docs, 2025).

## 3. Aplicaciones nativas, híbridas y multiplataforma

Las aplicaciones nativas se desarrollan para un sistema operativo concreto con sus lenguajes y SDK
oficiales —Kotlin en Android y Swift en iOS—, lo que brinda máxima fidelidad visual, rendimiento y
acceso a las APIs del dispositivo, a costa de duplicar el esfuerzo por plataforma (Apple, s. f.;
Budiu, 2013; Google, s. f.-a). Las híbridas reutilizan HTML, CSS y JavaScript dentro de un
contenedor nativo; Ionic + Capacitor permite además invocar SDK nativos mediante plugins, aunque el
renderizado ocurre en una WebView y el rendimiento depende de ella (Budiu, 2013; Ionic, s. f.). Las
multiplataforma compilan o renderizan una sola base de código en varias plataformas: Flutter usa
Dart con compilación nativa y widgets propios, mientras que React Native permite escribir con React
y producir componentes nativos (Google, s. f.-b; Meta Open Source, s. f.). La elección depende del
problema: nativa cuando el hardware o la UX de plataforma son críticos; híbrida o multiplataforma
cuando priman costo y tiempo al mercado; web o PWA cuando pesan la distribución abierta y el bajo
costo de mantenimiento (Budiu, 2013).

## 4. Qué es una PWA

Una PWA es una aplicación web que emplea APIs modernas —manifest, service workers y HTTPS— para
ofrecer instalación, funcionamiento offline e integración con el sistema operativo sin pasar por una
tienda de aplicaciones (MDN Web Docs, 2025). El manifest es un archivo JSON estandarizado por el W3C
que declara nombre, iconos, `start_url`, colores y modo de visualización, y permite al navegador
presentar el sitio como una app (W3C, 2026). El service worker actúa como proxy de red programable:
intercepta las peticiones y aplica estrategias de caché —cache-first, network-first o
stale-while-revalidate— para sostener la operación sin conexión (Archibald, 2018; MDN Web Docs,
2025). Para ser instalable, la PWA debe servirse por HTTPS o localhost y, en navegadores Chromium,
declarar iconos de 192 y 512 píxeles, `start_url` y `display` (MDN Web Docs, 2026). Entre las
limitaciones, Firefox no instala PWAs a partir del manifest (MDN Web Docs, 2026); en iOS la
instalación es manual ("Añadir a pantalla de inicio") y el push solo funciona desde iOS 16.4 en web
apps ancladas a la pantalla de inicio, nunca en pestañas de Safari, sin notificaciones silenciosas y
con revocación del permiso si la notificación no se muestra de inmediato (Apple, s. f.; WebKit,
2023).

## 5. Rol del cliente móvil dentro de un sistema de software

En el modelo cliente-servidor, el cliente envía peticiones HTTP y el servidor responde con recursos
o datos; el cliente asume la presentación y la captura de información, mientras la lógica de negocio
y la persistencia permanecen en el servidor (MDN Web Docs, 2026). Cuando coexisten varios tipos de
cliente, el patrón Backends for Frontends (BFF) propone un backend dedicado por interfaz —móvil,
web, escritorio— que agrega y adapta las respuestas a cada experiencia, evitando un backend genérico
que intente satisfacer a todos (Microsoft, 2025). Además, un cliente puede adoptar un enfoque
offline-first: tratar la red como una mejora y no como un requisito, sirviendo desde caché y
sincronizando cuando retorna la conexión (Archibald, 2018). El cliente deja así de ser un visor
pasivo y se convierte en una capa de presentación resiliente (MDN Web Docs, 2025).

## Aplicación al proyecto Epix

- La elección de una PWA React + TypeScript responde a las ventajas de la web (descubribilidad, sin
  tienda, actualización inmediata) y a la brecha cada vez menor frente a las apps nativas (Budiu,
  2013; MDN Web Docs, 2025).
- Epix consume la API pública de TVmaze como backend de datos; el cliente es la capa de presentación
  y no requiere BFF propio, aunque un BFF tendría sentido si se necesitara agregar o normalizar
  respuestas para varios clientes (MDN Web Docs, 2026; Microsoft, 2025).
- El manifest (nombre, iconos 192/512, `start_url`, `display: standalone`, `theme_color`) y el
  service worker configurado con `vite-plugin-pwa` son los requisitos para la instalación y el modo
  app (MDN Web Docs, 2026; W3C, 2026).
- El enfoque offline-first se traduce en cachear el catálogo y los favoritos con estrategias del
  service worker, mostrando datos aunque TVmaze no responda (Archibald, 2018).
- En iOS debe aceptarse la instalación manual y diseñar sin depender del push; en UX móvil, conviene
  priorizar la búsqueda con mínima escritura y una acción primaria por pantalla (Apple, s. f.;
  Soegaard, 2026; WebKit, 2023).
