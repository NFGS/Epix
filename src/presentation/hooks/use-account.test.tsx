import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AuthError } from '@/application/ports/auth';
import type { FavoriteShow } from '@/domain/entities/favorite';
import { DependenciesContext } from '@/presentation/hooks/dependencies-context';
import { createFakeAuth, type FakeAuth } from '@/test/fake-auth';
import { createTestDependencies, type TestDependencies } from '@/test/test-dependencies';

import { useAccount } from './use-account';

const T1 = '2026-10-05T10:00:00.000Z';
const ANONYMOUS = { id: 'user-1', email: null };
const LINKED = { id: 'user-1', email: 'ana@example.com' };

function renderAccount(deps: TestDependencies) {
  return renderHook(() => useAccount(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <DependenciesContext.Provider value={deps}>{children}</DependenciesContext.Provider>
    ),
  });
}

function createAnonymousDeps(fake: FakeAuth): TestDependencies {
  vi.mocked(fake.auth.getUser).mockResolvedValue({ ...ANONYMOUS });
  return createTestDependencies({ auth: fake.auth });
}

function createFavorite(): FavoriteShow {
  return {
    showId: 5,
    name: 'Dark',
    genres: ['Misterio'],
    addedAt: T1,
    updatedAt: T1,
    syncStatus: 'pending',
  };
}

describe('useAccount · estados', () => {
  it('queda en unconfigured sin Supabase configurado', () => {
    const deps = createTestDependencies();
    const { result } = renderAccount(deps);

    expect(result.current.state).toEqual({ status: 'unconfigured' });
    expect(result.current.error).toBeNull();
  });

  it('resuelve la sesión anónima con su userId', async () => {
    const fake = createFakeAuth();
    const { result } = renderAccount(createAnonymousDeps(fake));

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'anonymous', userId: 'user-1' });
    });
  });

  it('resuelve una cuenta vinculada con su correo', async () => {
    const fake = createFakeAuth();
    vi.mocked(fake.auth.getUser).mockResolvedValue({ ...LINKED });
    const { result } = renderAccount(createTestDependencies({ auth: fake.auth }));

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: 'linked',
        userId: 'user-1',
        email: 'ana@example.com',
      });
    });
  });

  it('queda en signed-out cuando no hay sesión', async () => {
    const fake = createFakeAuth();
    const { result } = renderAccount(createTestDependencies({ auth: fake.auth }));

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'signed-out' });
    });
  });
});

describe('useAccount · vincular y entrar', () => {
  it('en anónima, enviar código llama a linkEmail con estado sending', async () => {
    let resolveLink: () => void = () => undefined;
    const linkEmail = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveLink = resolve;
        }),
    );
    const fake = createFakeAuth({ linkEmail });
    const { result } = renderAccount(createAnonymousDeps(fake));

    await waitFor(() => {
      expect(result.current.state?.status).toBe('anonymous');
    });

    let pending: Promise<boolean> | null = null;
    act(() => {
      pending = result.current.requestCode('ana@example.com');
    });

    expect(result.current.status).toBe('sending');
    expect(linkEmail).toHaveBeenCalledWith('ana@example.com');

    await act(async () => {
      resolveLink();
      await pending;
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('en signed-out, enviar código llama a sendEmailOtp', async () => {
    const fake = createFakeAuth();
    const { result } = renderAccount(createTestDependencies({ auth: fake.auth }));

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'signed-out' });
    });

    await act(async () => {
      await result.current.requestCode('ana@example.com');
    });

    expect(fake.auth.sendEmailOtp).toHaveBeenCalledWith('ana@example.com');
    expect(fake.auth.linkEmail).not.toHaveBeenCalled();
  });

  it('el flujo de vinculación termina en linked y lanza un sync', async () => {
    const fake = createFakeAuth();
    vi.mocked(fake.auth.verifyEmailChange).mockImplementation(async () => {
      fake.emit({ ...LINKED });
      return { ...LINKED };
    });
    const deps = createAnonymousDeps(fake);
    const syncNow = vi.spyOn(deps.engine, 'syncNow');
    const { result } = renderAccount(deps);

    await waitFor(() => {
      expect(result.current.state?.status).toBe('anonymous');
    });

    let verified = false;
    await act(async () => {
      verified = await result.current.submitCode('ana@example.com', '123456');
    });

    expect(verified).toBe(true);
    expect(fake.auth.verifyEmailChange).toHaveBeenCalledWith('ana@example.com', '123456');
    expect(result.current.state).toEqual({
      status: 'linked',
      userId: 'user-1',
      email: 'ana@example.com',
    });
    expect(syncNow).toHaveBeenCalled();
  });

  it('en signed-out, verificar usa verifyEmailOtp (type email)', async () => {
    const fake = createFakeAuth();
    vi.mocked(fake.auth.verifyEmailOtp).mockImplementation(async () => {
      fake.emit({ ...LINKED });
      return { ...LINKED };
    });
    const { result } = renderAccount(createTestDependencies({ auth: fake.auth }));

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'signed-out' });
    });

    await act(async () => {
      await result.current.submitCode('ana@example.com', '123456');
    });

    expect(fake.auth.verifyEmailOtp).toHaveBeenCalledWith('ana@example.com', '123456');
    expect(result.current.state).toEqual({
      status: 'linked',
      userId: 'user-1',
      email: 'ana@example.com',
    });
  });

  it('un código inválido deja status error y el código tipado', async () => {
    const fake = createFakeAuth({
      verifyEmailChange: vi.fn(async () => {
        throw new AuthError('invalid-code', 'código incorrecto');
      }),
    });
    const { result } = renderAccount(createAnonymousDeps(fake));

    await waitFor(() => {
      expect(result.current.state?.status).toBe('anonymous');
    });

    await act(async () => {
      await result.current.submitCode('ana@example.com', '000000');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('invalid-code');
  });

  it('el límite de envíos se refleja como rate-limited', async () => {
    const fake = createFakeAuth({
      linkEmail: vi.fn(async () => {
        throw new AuthError('rate-limited', 'demasiados códigos');
      }),
    });
    const { result } = renderAccount(createAnonymousDeps(fake));

    await waitFor(() => {
      expect(result.current.state?.status).toBe('anonymous');
    });

    await act(async () => {
      await result.current.requestCode('ana@example.com');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('rate-limited');
  });

  it('clearError vuelve a idle', async () => {
    const fake = createFakeAuth({
      linkEmail: vi.fn(async () => {
        throw new AuthError('network', 'sin red');
      }),
    });
    const { result } = renderAccount(createAnonymousDeps(fake));

    await waitFor(() => {
      expect(result.current.state?.status).toBe('anonymous');
    });

    await act(async () => {
      await result.current.requestCode('ana@example.com');
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });
});

describe('useAccount · cerrar sesión', () => {
  it('borra los datos de usuario de Dexie y conserva las preferencias', async () => {
    const fake = createFakeAuth();
    const deps = createAnonymousDeps(fake);
    const { result } = renderAccount(deps);

    await waitFor(() => {
      expect(result.current.state?.status).toBe('anonymous');
    });

    await deps.favorites.add(createFavorite());
    await deps.history.addView({
      showId: 5,
      type: 'view',
      occurredAt: T1,
      syncStatus: 'pending',
    });
    await deps.usageEvents.add({
      id: 'event-1',
      eventType: 'session_start',
      occurredAt: T1,
      timezone: 'America/Bogota',
      appVersion: 'test',
    });
    await deps.outbox.enqueue({
      entity: 'favorite',
      operation: 'upsert',
      entityId: 5,
      payload: createFavorite(),
      createdAt: T1,
    });
    await deps.syncMeta.set('userId', 'user-1');
    await deps.preferences.update({ theme: 'dark' });

    await act(async () => {
      await result.current.signOut();
    });

    expect(fake.auth.signOut).toHaveBeenCalledTimes(1);
    expect(await deps.db.favorites.count()).toBe(0);
    expect(await deps.db.history.count()).toBe(0);
    expect(await deps.db.searchHistory.count()).toBe(0);
    expect(await deps.db.usageEvents.count()).toBe(0);
    expect(await deps.db.outbox.count()).toBe(0);
    expect(await deps.db.syncMeta.count()).toBe(0);
    expect((await deps.db.preferences.get('app'))?.theme).toBe('dark');
    expect(result.current.state).toEqual({ status: 'signed-out' });
  });

  it('si el cierre falla, muestra el error y no borra nada', async () => {
    const fake = createFakeAuth({
      signOut: vi.fn(async () => {
        throw new AuthError('network', 'sin red');
      }),
    });
    const deps = createAnonymousDeps(fake);
    const { result } = renderAccount(deps);

    await waitFor(() => {
      expect(result.current.state?.status).toBe('anonymous');
    });

    await deps.favorites.add(createFavorite());

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('network');
    expect(await deps.db.favorites.count()).toBe(1);
  });
});
