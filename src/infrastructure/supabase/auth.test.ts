import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { AuthError, authErrorCode } from '@/application/ports/auth';
import { SIGNED_OUT_STORAGE_KEY, type SessionPolicyStorage } from './session-policy';

import { createSupabaseAuth } from './auth';

interface AuthErrorLike {
  message: string;
  code?: string;
  status?: number;
  name?: string;
}

interface FakeUser {
  id: string;
  email?: string | null;
}

interface FakeSession {
  user: FakeUser;
}

interface FakeClientOptions {
  session?: FakeSession | null;
  sessionError?: AuthErrorLike | null;
  signInWithOtpError?: AuthErrorLike | null;
  verifyOtpError?: AuthErrorLike | null;
  verifyOtpUser?: FakeUser | null;
  updateUserError?: AuthErrorLike | null;
  signOutError?: AuthErrorLike | null;
}

type AuthChangeHandler = (event: string, session: FakeSession | null) => void;

function createMemoryStorage(initial: Record<string, string> = {}): SessionPolicyStorage & {
  read(key: string): string | null;
} {
  const store = new Map<string, string>(Object.entries(initial));

  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    read: (key) => store.get(key) ?? null,
  };
}

function createFakeClient(options: FakeClientOptions = {}) {
  const handlers: AuthChangeHandler[] = [];
  const unsubscribe = vi.fn();
  const calls = {
    signInWithOtp: [] as unknown[],
    verifyOtp: [] as unknown[],
    updateUser: [] as unknown[],
    signOut: [] as unknown[],
  };

  const client = {
    auth: {
      signInWithOtp: async (args: unknown) => {
        calls.signInWithOtp.push(args);
        return { data: { user: null, session: null }, error: options.signInWithOtpError ?? null };
      },
      verifyOtp: async (args: unknown) => {
        calls.verifyOtp.push(args);
        return {
          data: {
            user: options.verifyOtpError == null ? (options.verifyOtpUser ?? null) : null,
            session: null,
          },
          error: options.verifyOtpError ?? null,
        };
      },
      updateUser: async (args: unknown) => {
        calls.updateUser.push(args);
        return { data: { user: null }, error: options.updateUserError ?? null };
      },
      signOut: async (args: unknown) => {
        calls.signOut.push(args);
        return { error: options.signOutError ?? null };
      },
      getSession: async () => ({
        data: { session: options.session ?? null },
        error: options.sessionError ?? null,
      }),
      onAuthStateChange: (handler: AuthChangeHandler) => {
        handlers.push(handler);
        return { data: { subscription: { unsubscribe } } };
      },
    },
  };

  return {
    client: client as unknown as SupabaseClient,
    calls,
    unsubscribe,
    emit(session: FakeSession | null) {
      for (const handler of handlers) {
        handler('SIGNED_IN', session);
      }
    },
  };
}

describe('supabase auth · OTP por correo', () => {
  it('envía el código con signInWithOtp', async () => {
    const { client, calls } = createFakeClient();
    const auth = createSupabaseAuth(client, { storage: createMemoryStorage() });

    await auth.sendEmailOtp('ana@example.com');

    expect(calls.signInWithOtp).toEqual([{ email: 'ana@example.com' }]);
  });

  it('clasifica el límite de envíos como rate-limited', async () => {
    const { client } = createFakeClient({
      signInWithOtpError: {
        message: 'Email rate limit exceeded',
        code: 'over_email_send_rate_limit',
        status: 429,
      },
    });
    const auth = createSupabaseAuth(client, { storage: createMemoryStorage() });

    const error = await auth.sendEmailOtp('ana@example.com').catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(AuthError);
    expect(authErrorCode(error)).toBe('rate-limited');
  });

  it('verifica el código de acceso con type email y devuelve el usuario', async () => {
    const storage = createMemoryStorage({ [SIGNED_OUT_STORAGE_KEY]: '1' });
    const { client, calls } = createFakeClient({
      verifyOtpUser: { id: 'user-9', email: 'ana@example.com' },
    });
    const auth = createSupabaseAuth(client, { storage });

    const user = await auth.verifyEmailOtp('ana@example.com', '123456');

    expect(calls.verifyOtp).toEqual([
      { email: 'ana@example.com', token: '123456', type: 'email' },
    ]);
    expect(user).toEqual({ id: 'user-9', email: 'ana@example.com' });
    expect(storage.read(SIGNED_OUT_STORAGE_KEY)).toBeNull();
  });

  it('clasifica un código incorrecto como invalid-code', async () => {
    const { client } = createFakeClient({
      verifyOtpError: { message: 'Invalid token', code: 'invalid_credentials' },
    });
    const auth = createSupabaseAuth(client, { storage: createMemoryStorage() });

    const error = await auth.verifyEmailOtp('ana@example.com', '000000').catch(
      (cause: unknown) => cause,
    );

    expect(authErrorCode(error)).toBe('invalid-code');
  });

  it('clasifica un código expirado como expired-code', async () => {
    const { client } = createFakeClient({
      verifyOtpError: { message: 'Token has expired', code: 'otp_expired' },
    });
    const auth = createSupabaseAuth(client, { storage: createMemoryStorage() });

    const error = await auth.verifyEmailOtp('ana@example.com', '000000').catch(
      (cause: unknown) => cause,
    );

    expect(authErrorCode(error)).toBe('expired-code');
  });

  it('falla con un correo inválido como invalid-email', async () => {
    const { client } = createFakeClient({
      signInWithOtpError: {
        message: 'Unable to validate email address: invalid format',
        code: 'validation_failed',
      },
    });
    const auth = createSupabaseAuth(client, { storage: createMemoryStorage() });

    const error = await auth.sendEmailOtp('no-es-correo').catch((cause: unknown) => cause);

    expect(authErrorCode(error)).toBe('invalid-email');
  });

  it('clasifica un fallo de red como network', async () => {
    const { client } = createFakeClient({
      signInWithOtpError: { message: 'Failed to fetch', name: 'AuthRetryableFetchError' },
    });
    const auth = createSupabaseAuth(client, { storage: createMemoryStorage() });

    const error = await auth.sendEmailOtp('ana@example.com').catch((cause: unknown) => cause);

    expect(authErrorCode(error)).toBe('network');
  });
});

describe('supabase auth · vinculación same-uid', () => {
  it('vincula el correo con updateUser', async () => {
    const { client, calls } = createFakeClient();
    const auth = createSupabaseAuth(client, { storage: createMemoryStorage() });

    await auth.linkEmail('ana@example.com');

    expect(calls.updateUser).toEqual([{ email: 'ana@example.com' }]);
  });

  it('clasifica un correo ya registrado como email-in-use', async () => {
    const { client } = createFakeClient({
      updateUserError: {
        message: 'A user with this email address has already been registered',
        code: 'email_exists',
      },
    });
    const auth = createSupabaseAuth(client, { storage: createMemoryStorage() });

    const error = await auth.linkEmail('ana@example.com').catch((cause: unknown) => cause);

    expect(authErrorCode(error)).toBe('email-in-use');
  });

  it('confirma la vinculación con type email_change y quita la marca de cierre', async () => {
    const storage = createMemoryStorage({ [SIGNED_OUT_STORAGE_KEY]: '1' });
    const { client, calls } = createFakeClient({
      verifyOtpUser: { id: 'user-1', email: 'ana@example.com' },
    });
    const auth = createSupabaseAuth(client, { storage });

    const user = await auth.verifyEmailChange('ana@example.com', '654321');

    expect(calls.verifyOtp).toEqual([
      { email: 'ana@example.com', token: '654321', type: 'email_change' },
    ]);
    expect(user).toEqual({ id: 'user-1', email: 'ana@example.com' });
    expect(storage.read(SIGNED_OUT_STORAGE_KEY)).toBeNull();
  });

  it('lanza unknown si Supabase no devuelve usuario al verificar', async () => {
    const { client } = createFakeClient({ verifyOtpUser: null });
    const auth = createSupabaseAuth(client, { storage: createMemoryStorage() });

    const error = await auth.verifyEmailChange('ana@example.com', '654321').catch(
      (cause: unknown) => cause,
    );

    expect(error).toBeInstanceOf(AuthError);
    expect(authErrorCode(error)).toBe('unknown');
  });
});

describe('supabase auth · sesión', () => {
  it('cierra la sesión solo en el dispositivo y marca el cierre explícito', async () => {
    const storage = createMemoryStorage();
    const { client, calls } = createFakeClient();
    const auth = createSupabaseAuth(client, { storage });

    await auth.signOut();

    expect(calls.signOut).toEqual([{ scope: 'local' }]);
    expect(storage.read(SIGNED_OUT_STORAGE_KEY)).toBe('1');
  });

  it('propaga el error de cierre de sesión', async () => {
    const { client } = createFakeClient({
      signOutError: { message: 'Failed to fetch', name: 'AuthRetryableFetchError' },
    });
    const auth = createSupabaseAuth(client, { storage: createMemoryStorage() });

    const error = await auth.signOut().catch((cause: unknown) => cause);

    expect(authErrorCode(error)).toBe('network');
  });

  it('getUser devuelve null sin sesión y mapea al usuario con sesión', async () => {
    const empty = createFakeClient({ session: null });
    const emptyAuth = createSupabaseAuth(empty.client, { storage: createMemoryStorage() });
    expect(await emptyAuth.getUser()).toBeNull();

    const anonymous = createFakeClient({ session: { user: { id: 'user-1', email: null } } });
    const anonymousAuth = createSupabaseAuth(anonymous.client, { storage: createMemoryStorage() });
    expect(await anonymousAuth.getUser()).toEqual({ id: 'user-1', email: null });

    const linked = createFakeClient({ session: { user: { id: 'user-2', email: 'a@b.co' } } });
    const linkedAuth = createSupabaseAuth(linked.client, { storage: createMemoryStorage() });
    expect(await linkedAuth.getUser()).toEqual({ id: 'user-2', email: 'a@b.co' });
  });

  it('onAuthStateChange mapea la sesión y desuscribe al limpiar', () => {
    const { client, unsubscribe, emit } = createFakeClient();
    const auth = createSupabaseAuth(client, { storage: createMemoryStorage() });
    const listener = vi.fn();

    const dispose = auth.onAuthStateChange(listener);

    emit({ user: { id: 'user-1', email: 'a@b.co' } });
    expect(listener).toHaveBeenLastCalledWith({ id: 'user-1', email: 'a@b.co' });

    emit(null);
    expect(listener).toHaveBeenLastCalledWith(null);

    dispose();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
