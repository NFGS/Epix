import type { PreferencesPatch, UserPreferences } from '../entities/preferences';

/**
 * Actualizador funcional: recibe el estado vigente dentro de la transacción.
 * Evita perder cambios cuando dos taps rápidos parten del mismo estado viejo.
 */
export type PreferencesPatchUpdater = (current: UserPreferences) => PreferencesPatch;

/**
 * Puerto de preferencias: lectura única del dispositivo y actualización parcial.
 * La implementación local vive en `infrastructure/local/preferences.repository.ts`.
 */
export interface PreferencesRepository {
  /** Devuelve las preferencias (crea y persiste los valores por defecto en el primer uso). */
  get(): Promise<UserPreferences>;

  /** Aplica un cambio parcial (o un actualizador funcional), sella `updatedAt` y devuelve el estado resultante. */
  update(patch: PreferencesPatch | PreferencesPatchUpdater): Promise<UserPreferences>;
}
