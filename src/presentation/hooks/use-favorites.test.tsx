import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { Show } from '@/domain/entities/show';
import { DependenciesContext } from '@/presentation/hooks/dependencies-context';
import { createTestDependencies, type TestDependencies } from '@/test/test-dependencies';

import { useToggleFavorite } from './use-favorites';

const SHOW: Show = { id: 7, name: 'Girls', genres: ['Drama'] };

function createWrapper(dependencies: TestDependencies) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <DependenciesContext.Provider value={dependencies}>{children}</DependenciesContext.Provider>
    );
  };
}

describe('useToggleFavorite · telemetría', () => {
  it('registra favorite_add y favorite_remove con el id de la serie', async () => {
    const track = vi.fn(async () => undefined);
    const dependencies = createTestDependencies({ telemetry: { track } });
    const { result } = renderHook(() => useToggleFavorite(SHOW), {
      wrapper: createWrapper(dependencies),
    });

    await act(async () => {
      await result.current.toggle();
    });
    expect(track).toHaveBeenCalledWith('favorite_add', { showId: 7 });

    await act(async () => {
      await result.current.toggle();
    });
    expect(track).toHaveBeenCalledWith('favorite_remove', { showId: 7 });
  });
});
