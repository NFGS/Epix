/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Versión de `package.json` inyectada por `define` en `vite.config.ts`. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Clave pública VAPID (Web Push). Opcional: sin ella no se muestra el push. */
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  /** DSN de Sentry. Opcional: sin él no se carga el SDK de reportes de errores. */
  readonly VITE_SENTRY_DSN?: string;
  /** Entorno de Sentry. Opcional: por defecto se usa el `MODE` de Vite. */
  readonly VITE_SENTRY_ENVIRONMENT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
