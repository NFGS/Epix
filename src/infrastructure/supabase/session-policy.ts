/**
 * Marca local de «cierre de sesión explícito».
 *
 * Tras cerrar sesión en un dispositivo compartido, el motor de sincronización
 * no debe crear una sesión anónima nueva por su cuenta (lo devolvería a
 * «anónimo» y subiría telemetría a una cuenta nueva). Este módulo, sin
 * dependencias de Supabase, decide si el sync queda en pausa. La marca se
 * limpia al verificar un código de acceso o de vinculación.
 *
 * `localStorage` inyectable para pruebas; los fallos de almacenamiento
 * (modo privado) degradan sin romper.
 */

export const SIGNED_OUT_STORAGE_KEY = 'epix:auth:signed-out';

export type SessionPolicyStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): SessionPolicyStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function isSignedOutExplicitly(
  storage: SessionPolicyStorage | null = defaultStorage(),
): boolean {
  try {
    return storage?.getItem(SIGNED_OUT_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markSignedOut(storage: SessionPolicyStorage | null = defaultStorage()): void {
  try {
    storage?.setItem(SIGNED_OUT_STORAGE_KEY, '1');
  } catch {
    // Sin almacenamiento disponible: la sesión igualmente quedó cerrada.
  }
}

export function clearSignedOutMark(storage: SessionPolicyStorage | null = defaultStorage()): void {
  try {
    storage?.removeItem(SIGNED_OUT_STORAGE_KEY);
  } catch {
    // Sin almacenamiento disponible: no hay marca que limpiar.
  }
}
