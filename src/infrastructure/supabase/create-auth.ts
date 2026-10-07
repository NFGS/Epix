import type { CloudAuth } from '@/application/ports/auth';

/**
 * Adaptador de auth perezoso: `@supabase/supabase-js` se carga en un chunk
 * aparte solo cuando el usuario interactúa con la cuenta y hay configuración.
 * Trade-off: la primera acción de cuenta espera la descarga del chunk.
 */
export function createLazySupabaseAuth(): CloudAuth {
  let authPromise: Promise<CloudAuth> | null = null;

  function load(): Promise<CloudAuth> {
    authPromise ??= import('./auth').then((module) => {
      const auth = module.createSupabaseAuthFromEnv();

      if (auth === null) {
        throw new Error('Supabase dejó de estar configurado.');
      }

      return auth;
    });

    return authPromise;
  }

  return {
    sendEmailOtp: async (email) => (await load()).sendEmailOtp(email),
    verifyEmailOtp: async (email, token) => (await load()).verifyEmailOtp(email, token),
    linkEmail: async (email) => (await load()).linkEmail(email),
    verifyEmailChange: async (email, token) => (await load()).verifyEmailChange(email, token),
    signOut: async () => (await load()).signOut(),
    getUser: async () => (await load()).getUser(),
    onAuthStateChange: (listener) => {
      let active = true;
      let dispose: (() => void) | null = null;

      void load().then((auth) => {
        if (!active) {
          return;
        }

        dispose = auth.onAuthStateChange(listener);
      });

      return () => {
        active = false;
        dispose?.();
      };
    },
  };
}
