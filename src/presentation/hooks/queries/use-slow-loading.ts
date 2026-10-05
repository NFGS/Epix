import { useEffect, useState } from 'react';

export const SLOW_LOADING_MS = 8_000;

/** `true` cuando una carga sigue activa tras `delayMs` (aviso «está tardando»). */
export function useSlowLoading(isLoading: boolean, delayMs: number = SLOW_LOADING_MS): boolean {
  const [isSlow, setIsSlow] = useState(false);
  const [wasLoading, setWasLoading] = useState(isLoading);

  if (wasLoading !== isLoading) {
    setWasLoading(isLoading);
    if (!isLoading) {
      setIsSlow(false);
    }
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
