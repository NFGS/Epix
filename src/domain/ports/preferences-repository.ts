import type { PreferencesPatch, UserPreferences } from '../entities/preferences';

/**
 * Puerto de preferencias: lectura única del dispositivo y actualización parcial.
 * La implementación local vive en `infrastructure/local/preferences.repository.ts`.
 */
export interface PreferencesRepository {
  /** Devuelve las preferencias (crea y persiste los valores por defecto en el primer uso). */
  get(): Promise<UserPreferences>;

  /** Aplica un cambio parcial, sella `updatedAt` y devuelve el estado resultante. */
  update(patch: PreferencesPatch): Promise<UserPreferences>;
}
