import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { DependenciesContext } from '@/presentation/hooks/dependencies-context';
import { createTestDependencies, type TestDependencies } from '@/test/test-dependencies';

import { useSyncMeta } from './use-sync-meta';

const T1 = '2026-10-05T10:00:00.000Z';

function createWrapper(dependencies: TestDependencies) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <DependenciesContext.Provider value={dependencies}>{children}</DependenciesContext.Provider>
    );
  };
}

describe('useSyncMeta (R-15)', () => {
  it('lee el valor de syncMeta y reacciona a sus cambios', async () => {
    const dependencies = createTestDependencies();
    const { result } = renderHook(() => useSyncMeta('lastSyncAt'), {
      wrapper: createWrapper(dependencies),
    });

    await waitFor(() => {
      expect(result.current).toBeNull();
    });

    await dependencies.syncMeta.set('lastSyncAt', T1);

    await waitFor(() => {
      expect(result.current).toBe(T1);
    });
  });
});
