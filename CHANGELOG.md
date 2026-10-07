# Changelog

Todos los cambios relevantes de este proyecto se documentan aquí.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Added
- ADRs (MADR) de las decisiones arquitectónicas en `docs/adr/`.
- Cobertura de pruebas con umbrales (domain/application ≥ 70 %).
- Logger tipado y validación de variables de entorno con Zod.
- CI ampliado: artefacto de cobertura, caché de Playwright, `pnpm audit`,
  Dependabot y CodeQL.
- Documentos de comunidad: CONTRIBUTING, SECURITY y CODE_OF_CONDUCT.
- Cuentas reales: OTP por correo, vinculación anónimo→permanente (mismo `uid`),
  sincronización multi-dispositivo con Realtime y sync multi-pestaña
  (Web Locks + BroadcastChannel); pantalla «Cuenta» (ADR-0010).
- Rendimiento: code splitting por ruta, shell estático de arranque, hints de
  imagen LCP/CLS y presupuesto de tamaño (`size-limit`) en CI.
- Pulido PWA: aviso de «nueva versión disponible» (service worker en modo
  prompt), capturas y atajos en el manifest, `Permissions-Policy` + COOP y
  página de privacidad in-app (`/privacy`).
- Calidad de datos y pipeline: mejoras de Supabase Advisors (índices de claves
  foráneas y políticas RLS con `initplan`), función de retención
  `purge_epix_data`, **Lighthouse CI** (accesibilidad bloqueante), metadatos
  iOS y auditoría de dependencias de producción bloqueante.

### Fixed
- El correo vacío (`''`) de los usuarios anónimos de Supabase se normaliza a
  `null`: la pantalla «Cuenta» muestra el flujo de vinculación en vez de un
  estado «vinculado» sin correo.
- Auth: el campo de código solo aceptaba 6 dígitos mientras el proyecto emitía
  de 8 (`mailer_otp_length`); ahora el proyecto emite 6 y el campo acepta
  longitudes mayores. Los enlaces de correo establecen sesión
  (`detectSessionInUrl`) y vuelven a `/account`.

## [1.0.0] - 2026-10-06

### Added
- PWA instalable (manifest + service worker) con React 19, Vite, TypeScript y
  Tailwind CSS 4.
- Consumo completo de la API pública de TVmaze (búsqueda, detalle, episodios y
  agenda por país) con contratos Zod, timeouts, reintentos y backoff ante 429.
- Caché de red Workbox: `NetworkFirst` para API y `CacheFirst` para imágenes.
- Persistencia offline-first con Dexie/IndexedDB: favoritos, historial,
  preferencias y cola *outbox* con resolución last-write-wins.
- Sincronización con Supabase (PostgreSQL + RLS + sesiones anónimas) verificada
  end-to-end en producción.
- Personalización de interfaz (tema claro/oscuro/sistema, idioma es/en) y de
  contenido (géneros favoritos y edad estimada por géneros).
- GPS → país con consentimiento explícito, geocodificación inversa (Nominatim)
  y alternativa manual.
- Notificaciones locales de nuevos episodios con deep link a la serie.
- Telemetría de uso opt-in con panel «Mi actividad» y borrado de datos.
- Sistema de diseño propio (Open Design: base Spotify × disciplina Runway).
- Evidencias: capturas, diagramas explorables (Archify) y colección Postman.

### Security
- CSP estricta como header HTTP en Vercel, `X-Content-Type-Options`,
  `Referrer-Policy` y auditoría OWASP sin hallazgos críticos/altos.
- Zod `jitless` para evitar `new Function` bajo CSP sin `'unsafe-eval'`.

### Fixed
- Correcciones de la revisión senior: purga del outbox al borrar datos, LWW
  determinista, validación Zod del pull remoto, focus trap en diálogos y
  validación de origen del service worker.

[Unreleased]: https://github.com/NFGS/Epix/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/NFGS/Epix/releases/tag/v1.0.0
