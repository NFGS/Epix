/**
 * Convierte el resumen HTML de TVmaze en texto plano.
 * Usa DOMParser cuando está disponible (navegador/jsdom) y cae a una
 * limpieza por expresión regular en entornos sin DOM (p. ej. SSR).
 */
export function stripHtml(html: string | null | undefined): string {
  if (html === null || html === undefined) {
    return '';
  }

  const input = html.trim();
  if (input.length === 0) {
    return '';
  }

  if (typeof DOMParser !== 'undefined') {
    const parsed = new DOMParser().parseFromString(input, 'text/html');
    return normalizeWhitespace(parsed.body.textContent ?? '');
  }

  return normalizeWhitespace(input.replace(/<[^>]*>/g, ' '));
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
