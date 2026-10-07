import type { SupabaseClient } from '@supabase/supabase-js';

import { AuthError, type AuthUser, type CloudAuth } from '@/application/ports/auth';

import { getSupabaseClient } from './client';
import {
  clearSignedOutMark,
  markSignedOut,
  type SessionPolicyStorage,
} from './session-policy';

/** Subconjunto de `AuthError` de Supabase que necesitamos para clasificar. */
interface SupabaseAuthErrorLike {
  message: string;
  code?: string;
  status?: number;
  name?: string;
}

export interface SupabaseAuthOptions {
  /** Almacén de la marca de cierre de sesión; por defecto `window.localStorage`. */
  storage?: SessionPolicyStorage | null;
}

function resolveStorage(storage: SessionPolicyStorage | null | undefined): SessionPolicyStorage | null {
  if (storage !== undefined) {
    return storage;
  }

  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Clasifica un error de Supabase en un `AuthError` tipado y traducible.
 * El mensaje conserva el contexto en español para logs y diagnóstico.
 */
function mapAuthError(error: SupabaseAuthErrorLike, context: string): AuthError {
  const code = error.code ?? '';
  const text = `${code} ${error.message}`.toLowerCase();

  if (
    error.status === 429 ||
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    text.includes('rate limit') ||
    text.includes('too many requests')
  ) {
    return new AuthError('rate-limited', `${context}: ${error.message}`);
  }

  if (code === 'otp_expired' || text.includes('expired')) {
    return new AuthError('expired-code', `${context}: ${error.message}`);
  }

  if (
    code === 'email_exists' ||
    text.includes('already been registered') ||
    text.includes('already registered')
  ) {
    return new AuthError('email-in-use', `${context}: ${error.message}`);
  }

  if (code === 'validation_failed' && text.includes('email')) {
    return new AuthError('invalid-email', `${context}: ${error.message}`);
  }

  if (
    code === 'invalid_credentials' ||
    text.includes('invalid') ||
    text.includes('incorrect')
  ) {
    return new AuthError('invalid-code', `${context}: ${error.message}`);
  }

  if (
    error.name === 'AuthRetryableFetchError' ||
    text.includes('fetch') ||
    text.includes('network') ||
    text.includes('timeout')
  ) {
    return new AuthError('network', `${context}: ${error.message}`);
  }

  return new AuthError('unknown', `${context}: ${error.message}`);
}

function assertNoError(error: SupabaseAuthErrorLike | null, context: string): void {
  if (error !== null) {
    throw mapAuthError(error, context);
  }
}

function normalizeEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim();
  return trimmed ? trimmed : null;
}

function toAuthUser(user: { id: string; email?: string | null } | null | undefined): AuthUser {
  if (user === null || user === undefined) {
    throw new AuthError('unknown', 'Supabase no devolvió el usuario autenticado.');
  }

  // Los usuarios anónimos de Supabase pueden llegar con email '' (no null);
  // normalizamos para que la UI los trate como anónimos y no como «vinculados».
  return { id: user.id, email: normalizeEmail(user.email) };
}

/**
 * Adaptador de autenticación sobre Supabase (OTP por correo, sin contraseñas).
 *
 * Vinculación anónimo→permanente **same-uid**: `updateUser({ email })` +
 * `verifyOtp({ type: 'email_change' })`; la UI avisa que primero se vincula en
 * este dispositivo y después se inicia sesión en los demás.
 */
export function createSupabaseAuth(
  client: SupabaseClient,
  options: SupabaseAuthOptions = {},
): CloudAuth {
  const storage = resolveStorage(options.storage);

  return {
    async sendEmailOtp(email: string): Promise<void> {
      const { error } = await client.auth.signInWithOtp({ email });
      assertNoError(error, 'No se pudo enviar el código');
    },

    async verifyEmailOtp(email: string, token: string): Promise<AuthUser> {
      const { data, error } = await client.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      assertNoError(error, 'No se pudo verificar el código');

      const user = toAuthUser(data.user);
      clearSignedOutMark(storage);
      return user;
    },

    async linkEmail(email: string): Promise<void> {
      const { error } = await client.auth.updateUser({ email });
      assertNoError(error, 'No se pudo vincular el correo');
    },

    async verifyEmailChange(email: string, token: string): Promise<AuthUser> {
      const { data, error } = await client.auth.verifyOtp({
        email,
        token,
        type: 'email_change',
      });
      assertNoError(error, 'No se pudo verificar la vinculación');

      const user = toAuthUser(data.user);
      clearSignedOutMark(storage);
      return user;
    },

    async signOut(): Promise<void> {
      // `scope: 'local'`: cerrar aquí no expulsa la sesión de los demás dispositivos.
      const { error } = await client.auth.signOut({ scope: 'local' });
      assertNoError(error, 'No se pudo cerrar la sesión');
      markSignedOut(storage);
    },

    async getUser(): Promise<AuthUser | null> {
      const { data, error } = await client.auth.getSession();
      assertNoError(error, 'No se pudo leer la sesión');

      const user = data.session?.user ?? null;
      return user === null ? null : toAuthUser(user);
    },

    onAuthStateChange(listener: (user: AuthUser | null) => void): () => void {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        const user = session?.user ?? null;
        listener(user === null ? null : toAuthUser(user));
      });

      return () => {
        data.subscription.unsubscribe();
      };
    },
  };
}

/** Crea el adaptador desde `import.meta.env`; `null` si Supabase no está configurado. */
export function createSupabaseAuthFromEnv(): CloudAuth | null {
  const client = getSupabaseClient();
  return client === null ? null : createSupabaseAuth(client);
}
