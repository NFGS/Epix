# ADR-0001: Cliente PWA con React 19 + Vite + TypeScript

- **Estado:** Aceptado
- **Fecha:** 2026-10-05
- **Decisores:** Fabian (arquitecto / estudiante SENA ADSO)

## Contexto y problema

Epix es un proyecto académico del Tecnólogo en Análisis y Desarrollo de Software (SENA,
Armenia, Quindío) con cinco requisitos de plataforma innegociables del instructor
(`SPEC.md` §4): consumir la API de TVmaze (`REQ-01`), personalizar UI/contenido guardable
(`REQ-02`), usar el GPS del móvil (`REQ-03`), usar notificaciones (`REQ-04`) y registrar
telemetría en una base de datos (`REQ-05`). Ninguno de estos requisitos exige distribución
en tiendas de aplicaciones; sí exigen una app móvil usable y una evidencia demostrable.

La restricción dominante es el **costo de adopción y mantenimiento**: un solo desarrollador
(estudiante) debe poder entregar en ~9 incrementos (`SPEC.md` §7) con presupuesto de tiempo
de un semestre, sin pagar por cuentas de desarrollador ni por infraestructura de compilación
nativa. La decisión define el *framework* de toda la aplicación, por lo que condiciona el
resto de ADRs (arquitectura, persistencia, service worker, CI/CD).

## Impulsores de la decisión

- **Costo de distribución nulo:** sin Google Play ($25 una vez) ni App Store ($99/año), sin
  revisión de tienda.
- **Costo de mantenimiento bajo:** un solo codebase, un solo lenguaje (TypeScript), sin
  Swift/Kotlin ni dos pipelines de build.
- **Offline con service worker** (`REQ-06`, `RF-12`, `RF-14`): PWA instalable con manifest +
  SW es requisito explícito del curso.
- **Acceso a APIs nativas mínimas:** GPS (`Geolocation API`) y notificaciones locales
  (`Notification API`) están disponibles en la web móvil con solo permiso del usuario.
- **Rendimiento y calidad medible:** Lighthouse PWA ≥ 90 como métrica de éxito (`SPEC.md` §2,
  O5) y presupuesto de bundle < 250 KB gzip (`RNF-01`).
- **Contexto académico:** las tecnologías web son directamente evaluables con capturas,
  DevTools y Postman (`REQ-09`).

## Opciones consideradas

### Opción A — App nativa (Kotlin/Swift)

- **Pros:** acceso total a hardware, push real, rendimiento máximo.
- **Contras:** dos codebases y dos toolchains; distribución sujeta a cuentas de tienda y
  revisión; inviable en tiempo para un solo estudiante; el GPS y las notificaciones locales
  del curso no requieren el nivel de integración nativa.

### Opción B — Híbrido (Ionic/Capacitor o React Native)

- **Pros:** un solo lenguaje (TS), acceso a plugins nativos si se necesitan, distribución en
  tiendas posible.
- **Contras:** capa de build/empaquetado extra (Capacitor/Android Studio), complejidad de
  configuración y firma; para los 5 requisitos no aporta nada que una PWA no cubra; aumenta el
  riesgo de fricción de entrega sin beneficio demostrable en el alcance actual.

### Opción C — PWA con React 19 + Vite + TypeScript (elegida)

- **Pros:** distribución por URL (sin tiendas), instalable en Android (Chrome/Edge) y iOS
  ≥ 16.4 (Safari), offline-first con service worker, un codebase mantenible, toolchain
  madura (Vite + `vite-plugin-pwa`), tipado estricto y ecosistema de testing (Vitest +
  Playwright).
- **Contras:** sin push real con servidor VAPID (solo notificaciones locales), dependencia del
  soporte de SW del navegador, menor integración de hardware que lo nativo.

## Resultado de la decisión

Se eligió la **Opción C: PWA con React 19 + Vite + TypeScript**, fijada en `package.json`
(`react ^19.2.8`, `vite ^8.3.0`, `typescript ~6.0.2`, `vite-plugin-pwa ^2.0.0`). La PWA
cumple los 5 requisitos con la mínima superficie de mantenimiento, distribución gratuita y
evidencia académica directa (Lighthouse, capturas, instalación "Agregar a pantalla de inicio",
`RF-14`). El scaffolding se materializó en el commit `c89dbf5` (*feat: agrega scaffolding de
la PWA y diseño base, fase 2 incremento 1*).

Se acepta explícitamente que el push con servidor VAPID y las cuentas reales quedan **fuera
del alcance** (`SPEC.md` §3), usando notificaciones locales y auth anónima (ver ADR-0004).

## Consecuencias

### Positivas

- Una sola base de código TypeScript en todo el proyecto (UI, dominio, SW).
- Build reproducible con `pnpm build` (`tsc -b && vite build`), instalable y cacheable.
- Verificación de PWA con Lighthouse (`docs/evidencias/lighthouse-produccion.json`).

### Negativas / Riesgos

- Notificaciones limitadas a locales; sin re-engagement push en segundo plano real.
- En iOS las capacidades offline dependen de la versión de Safari (≥ 16.4 para instalación).
- Sin acceso a APIs nativas profundas (bluetooth, ficheros del sistema) si el alcance crece.

### Deuda técnica asumida

- Si en el futuro se requiriese push real o distribución en tiendas, habría que evaluar
  Capacitor como puente sin abandonar el codebase React (migración contenida, no reescritura).

## Cumplimiento / Enlaces

- `package.json` (dependencias fijadas).
- `vite.config.ts` (configuración `VitePWA`, manifest e iconos).
- `SPEC.md` §2–§4 y `docs/requisitos.md` (`RF-12`, `RF-14`, `RNF-01`, `RNF-06`).
- `README.md` §Stack; Lighthouse: `docs/evidencias/lighthouse-produccion.json`.
