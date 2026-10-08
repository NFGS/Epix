/**
 * E-01: comparación de secretos en tiempo constante.
 *
 * Se hashean ambos valores con SHA-256 (`crypto.subtle`, disponible en Deno y
 * en Node) y se comparan los digests byte a byte con XOR acumulado, de modo
 * que el tiempo de ejecución no dependa de cuántos bytes coinciden. El hash
 * iguala longitudes, así que la comparación no filtra la longitud del secreto.
 */

const encoder = new TextEncoder();

export async function sha256Digest(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return new Uint8Array(digest);
}

export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < a.length; index += 1) {
    difference |= a[index] ^ b[index];
  }

  return difference === 0;
}

export async function timingSafeStringEqual(a: string, b: string): Promise<boolean> {
  const [digestA, digestB] = await Promise.all([sha256Digest(a), sha256Digest(b)]);
  return timingSafeEqual(digestA, digestB);
}
