/**
 * `true` solo para rutas internas del mismo origen.
 *
 * Rechaza URLs absolutas, protocol-relative (`//evil.com`) y el bypass de
 * barras invertidas (`/\evil`), que el parser WHATWG normaliza a `//evil`.
 * La comprobación final con `URL` garantiza que siga siendo mismo origen.
 */
const INTERNAL_BASE = 'https://epix.internal';

export function isInternalUrl(url: string): boolean {
  if (url.length === 0 || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\')) {
    return false;
  }

  try {
    return new URL(url, INTERNAL_BASE).origin === INTERNAL_BASE;
  } catch {
    return false;
  }
}
