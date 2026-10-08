/**
 * Fecha del error sin asumir `instanceof Error`: los `DOMException` de algunos
 * entornos (p. ej. el de jsdom en pruebas) no heredan de `Error`.
 */
export function errorName(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const name = (error as { name?: unknown }).name;

    if (typeof name === 'string' && name !== '') {
      return name;
    }
  }

  return 'UnknownError';
}
