# Política de seguridad — Epix

## Versiones soportadas

| Versión | Soporte |
| --- | --- |
| 1.x | ✅ Activa |

## Cómo reportar una vulnerabilidad

**No abras un issue público.** Escribe a
[nelson.fabian.gallego.s@gmail.com](mailto:nelson.fabian.gallego.s@gmail.com)
con:

1. Descripción del problema y su impacto potencial.
2. Pasos para reproducirlo (PoC mínimo si es posible).
3. Versión/commit afectado y entorno (navegador, dispositivo).

Recibirás respuesta en un máximo de 7 días hábiles. Se dará crédito en la
corrección si lo deseas.

## Alcance y arquitectura de seguridad

- **Cliente PWA sin backend propio**: los datos de TVmaze son públicos; las
  escrituras van a Supabase con **anon key** (pública por diseño) + **RLS** por
  `auth.uid()`. La `service_role` jamás reside en el cliente.
- **CSP estricta** vía header HTTP, `X-Content-Type-Options`, `Referrer-Policy`
  y `frame-ancestors 'none'` en producción.
- **Privacidad**: telemetría opt-in (no-op si está desactivada), datos mínimos,
  coordenadas GPS **no persistidas** y borrado de datos desde «Mi actividad».
- **Validación**: contratos Zod en todos los límites (TVmaze, Nominatim, pull de
  Supabase, variables de entorno).

## Fuera de alcance / considerados no vulnerables

- La `anon key` y la URL del proyecto Supabase son **públicas por diseño**
  (protegidas por RLS, no por secreto).
- Contenido de TVmaze (CC BY-SA): reportar erratas de datos a TVmaze.

## Gestión de dependencias

- `pnpm audit --audit-level=high` en CI.
- Dependabot semanal (npm + GitHub Actions).
- CodeQL para análisis estático en cada PR.
