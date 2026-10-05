/**
 * Caso de uso: resolver el país del usuario a partir del GPS.
 *
 * Orquesta dos puertos inyectables (`getPosition` y `reverseGeocode`) sin
 * conocer el navegador ni Nominatim; los errores tipados de la infraestructura
 * se propagan tal cual para que la presentación los traduzca.
 */

import type { ResolvedCountry } from '@/application/ports/location';

export type { ResolvedCountry } from '@/application/ports/location';

export interface ResolveCountryCoordinates {
  readonly latitude: number;
  readonly longitude: number;
}

export interface ResolveCountryDependencies {
  getPosition: () => Promise<ResolveCountryCoordinates>;
  reverseGeocode: (position: ResolveCountryCoordinates) => Promise<string>;
}

export async function resolveCountry(
  dependencies: ResolveCountryDependencies,
): Promise<ResolvedCountry> {
  const position = await dependencies.getPosition();
  const country = await dependencies.reverseGeocode(position);

  return { country, source: 'gps' };
}
