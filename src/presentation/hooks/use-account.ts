import { useCallback, useEffect, useState } from 'react';

import { authErrorCode, type AuthErrorCode, type AuthUser } from '@/application/ports/auth';
import { clearUserData } from '@/application/use-cases/clear-user-data';
import { logger } from '@/shared/lib/logger';

import { useDependencies } from './dependencies-context';

/** Estados de cuenta de Epix (máquina de estados de la pantalla Cuenta). */
export type AccountState =
  | { status: 'unconfigured' }
  | { status: 'signed-out' }
  | { status: 'anonymous'; userId: string }
  | { status: 'linked'; userId: string; email: string };

export type AccountActionStatus = 'idle' | 'sending' | 'verifying' | 'error';

export interface UseAccountResult {
  /** `null` mientras se resuelve la sesión inicial (la UI muestra skeleton). */
  state: AccountState | null;
  status: AccountActionStatus;
  error: AuthErrorCode | null;
  /**
   * Envía el código de 6 dígitos:
   * - sesión anónima → `linkEmail` (vinculación same-uid, sin migrar datos);
   * - sin sesión → `sendEmailOtp` (inicio de sesión en otro dispositivo).
   */
  requestCode(email: string): Promise<boolean>;
  /** Verifica el código según el estado: `email_change` (vincular) o `email` (entrar). */
  submitCode(email: string, token: string): Promise<boolean>;
  /** Cierra la sesión local y borra los datos de usuario de este dispositivo. */
  signOut(): Promise<void>;
  clearError(): void;
}

function toAccountState(user: AuthUser | null): AccountState {
  if (user === null) {
    return { status: 'signed-out' };
  }

  const email = user.email?.trim() ?? '';

  return email === ''
    ? { status: 'anonymous', userId: user.id }
    : { status: 'linked', userId: user.id, email };
}

/**
 * Estado y acciones de la cuenta (OTP por correo, sin contraseñas).
 *
 * - `unconfigured`: no hay `VITE_SUPABASE_*`; modo solo local.
 * - `anonymous`: sesión anónima de este dispositivo (aún sin correo).
 * - `linked`: cuenta permanente con correo; sobrevive al limpiar el navegador.
 * - `signed-out`: sin sesión tras un cierre explícito (dispositivo compartido).
 */
export function useAccount(): UseAccountResult {
  const deps = useDependencies();
  const auth = deps.auth;
  const [state, setState] = useState<AccountState | null>(
    auth === null ? { status: 'unconfigured' } : null,
  );
  const [status, setStatus] = useState<AccountActionStatus>('idle');
  const [error, setError] = useState<AuthErrorCode | null>(null);

  useEffect(() => {
    if (auth === null) {
      return;
    }

    let active = true;

    void auth
      .getUser()
      .then((user) => {
        if (active) {
          setState(toAccountState(user));
        }
      })
      .catch((cause: unknown) => {
        logger.warn('Epix: no se pudo leer la sesión; se asume sin sesión.', cause);
        if (active) {
          setState({ status: 'signed-out' });
        }
      });

    const unsubscribe = auth.onAuthStateChange((user) => {
      setState(toAccountState(user));
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [auth]);

  const stateStatus = state?.status;

  const requestCode = useCallback(
    async (email: string): Promise<boolean> => {
      if (auth === null) {
        return false;
      }

      setStatus('sending');
      setError(null);

      try {
        if (stateStatus === 'anonymous') {
          await auth.linkEmail(email);
        } else {
          await auth.sendEmailOtp(email);
        }

        setStatus('idle');
        return true;
      } catch (cause) {
        setError(authErrorCode(cause));
        setStatus('error');
        return false;
      }
    },
    [auth, stateStatus],
  );

  const submitCode = useCallback(
    async (email: string, token: string): Promise<boolean> => {
      if (auth === null) {
        return false;
      }

      setStatus('verifying');
      setError(null);

      try {
        if (stateStatus === 'anonymous') {
          await auth.verifyEmailChange(email, token);
        } else {
          await auth.verifyEmailOtp(email, token);
        }

        setStatus('idle');
        // Al entrar/vinculando, la cuenta recupera su nube: sync inmediato.
        void deps.engine.syncNow();
        return true;
      } catch (cause) {
        setError(authErrorCode(cause));
        setStatus('error');
        return false;
      }
    },
    [auth, deps.engine, stateStatus],
  );

  const signOut = useCallback(async (): Promise<void> => {
    if (auth === null) {
      return;
    }

    setStatus('sending');
    setError(null);

    try {
      // E-05: en un dispositivo compartido la suscripción push de esta cuenta
      // se cancela ANTES de cerrar sesión (el borrado remoto en Supabase exige
      // la sesión por RLS) y antes de borrar los datos locales. El gateway la
      // ejecuta best-effort: nunca lanza.
      await deps.push.release();
      await auth.signOut();
      // Dispositivo compartido: fuera favoritos, historial, actividad y cola;
      // las preferencias de UI (tema/idioma/filtros) se conservan.
      await clearUserData(deps);
      setState({ status: 'signed-out' });
      setStatus('idle');
    } catch (cause) {
      setError(authErrorCode(cause));
      setStatus('error');
    }
  }, [auth, deps]);

  const clearError = useCallback(() => {
    setError(null);
    setStatus((current) => (current === 'error' ? 'idle' : current));
  }, []);

  return { state, status, error, requestCode, submitCode, signOut, clearError };
}
