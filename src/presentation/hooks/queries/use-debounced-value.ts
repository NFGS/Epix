import { useEffect, useState } from 'react';

export const DEFAULT_DEBOUNCE_MS = 400;

/** Devuelve `value` retrasado `delayMs`; cada cambio reinicia el temporizador. */
export function useDebouncedValue<T>(value: T, delayMs: number = DEFAULT_DEBOUNCE_MS): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
