import { Spinner } from './Spinner';

/**
 * Fallback de Suspense para rutas cargadas de forma perezosa: un spinner
 * contenido y centrado que reserva altura para no provocar saltos de layout.
 */
export function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner />
    </div>
  );
}
