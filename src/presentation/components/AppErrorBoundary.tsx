import { Component, type ErrorInfo, type ReactNode } from 'react';

import { reportError } from '@/infrastructure/observability/error-reporting';

import { AlertIcon } from './icons';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

/**
 * Fallback de última instancia: por estar fuera de `<AppProviders>` no puede
 * usar i18n ni el tema, así que usa el idioma por defecto (español) y los
 * tokens de diseño globales.
 */
function ErrorFallback() {
  return (
    <section
      role="alert"
      className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center"
    >
      <span className="mb-1 text-danger">
        <AlertIcon className="h-7 w-7" />
      </span>
      <h1 className="text-base font-bold">Algo salió mal</h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted">
        Epix encontró un error inesperado. Recarga la página para continuar.
      </p>
      <button
        type="button"
        onClick={() => {
          window.location.reload();
        }}
        className="mt-3 min-h-11 rounded-full bg-accent px-5 text-xs font-bold uppercase tracking-[1.4px] text-white transition-colors duration-150 hover:bg-accent-hover"
      >
        Recargar
      </button>
    </section>
  );
}

/**
 * Error boundary raíz (React 19 no incluye uno). Captura errores de render,
 * los reporta (no-op si Sentry está desactivado) y ofrece recargar la página.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    reportError(error, { componentStack: info.componentStack });
  }

  render(): ReactNode {
    return this.state.hasError ? <ErrorFallback /> : this.props.children;
  }
}
