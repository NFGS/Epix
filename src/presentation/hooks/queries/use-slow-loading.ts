import { useEffect, useState } from 'react';

export const SLOW_LOADING_MS = 8_000;

/**
 * `true` cuando una carga sigue activa tras `delayMs` (aviso «está tardando»).
 *
 * El reinicio se hace ajustando estado durante el render (patrón oficial de
 * React) para no encadenar renders desde un efecto (R-12); el temporizador
 * solo programa el aviso de lentitud y se limpia al cambiar la carga.
 */
export function useSlowLoading(isLoading: boolean, delayMs: number = SLOW_LOADING_MS): boolean {
  const [isSlow, setIsSlow] = useState(false);
  const [wasLoading, setWasLoading] = useState(isLoading);

  if (wasLoading !== isLoading) {
    setWasLoading(isLoading);
    setIsSlow(false);
  }

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const timer = setTimeout(() => {
      setIsSlow(true);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [isLoading, delayMs]);

  return isLoading && isSlow;
}
