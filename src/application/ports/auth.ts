/**
 * Puerto de autenticación en la nube (OTP por correo, sin contraseñas).
 *
 * La infraestructura lo implementa (`infrastructure/supabase/auth.ts`) y la
 * presentación lo consume sin conocer Supabase. Todos los métodos lanzan
 * `AuthError` con un `code` tipado y traducible.
 */

export interface AuthUser {
  id: string;
  /** `null` mientras la cuenta es anónima; el correo aparece al vincularla. */
  email: string | null;
}

export type AuthErrorCode =
  | 'invalid-email'
  | 'invalid-code'
  | 'expired-code'
  | 'rate-limited'
  | 'email-in-use'
  | 'network'
  | 'unknown';

const AUTH_ERROR_CODES: ReadonlySet<string> = new Set<AuthErrorCode>([
  'invalid-email',
  'invalid-code',
  'expired-code',
  'rate-limited',
  'email-in-use',
  'network',
  'unknown',
]);

/** Error de autenticación con código tipado (la UI lo traduce con i18n). */
export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

/** Extrae el código tipado de un error de auth; `'unknown'` si no lo tiene. */
export function authErrorCode(error: unknown): AuthErrorCode {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error as { code?: unknown };

    if (typeof code === 'string' && AUTH_ERROR_CODES.has(code)) {
      return code as AuthErrorCode;
    }
  }

  return 'unknown';
}

export interface CloudAuth {
  /** `signInWithOtp`: envía un código de 6 dígitos a un correo no registrado o existente. */
  sendEmailOtp(email: string): Promise<void>;
  /** `verifyOtp` con `type: 'email'`: inicia sesión en un dispositivo nuevo. */
  verifyEmailOtp(email: string, token: string): Promise<AuthUser>;
  /**
   * `updateUser({ email })`: vincula el correo a la sesión anónima actual
   * **sin cambiar el `uid`** (los datos no se migran).
   */
  linkEmail(email: string): Promise<void>;
  /** `verifyOtp` con `type: 'email_change'`: confirma la vinculación anterior. */
  verifyEmailChange(email: string, token: string): Promise<AuthUser>;
  /** Cierra la sesión solo en este dispositivo (`scope: 'local'`). */
  signOut(): Promise<void>;
  /** Usuario actual leyendo la sesión local (sin llamada de red al arrancar). */
  getUser(): Promise<AuthUser | null>;
  /** Observa cambios de sesión; devuelve la función para dejar de escuchar. */
  onAuthStateChange(listener: (user: AuthUser | null) => void): () => void;
}
