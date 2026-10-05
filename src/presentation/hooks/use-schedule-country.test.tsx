import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { DependenciesContext } from '@/presentation/hooks/dependencies-context';
import { createTestDependencies, type TestDependencies } from '@/test/test-dependencies';

import { useScheduleCountry } from './use-schedule-country';

function createWrapper(dependencies: TestDependencies) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <DependenciesContext.Provider value={dependencies}>{children}</DependenciesContext.Provider>
    );
  };
}

describe('useScheduleCountry', () => {
  it('respeta como país de agenda un GPS fuera de la lista curada', async () => {
    const dependencies = createTestDependencies();
    await dependencies.preferences.update({ country: 'CA', countrySource: 'gps' });

    const { result } = renderHook(() => useScheduleCountry(), {
      wrapper: createWrapper(dependencies),
    });

    await waitFor(() => {
      expect(result.current.country).toBe('CA');
    });
    expect(result.current.countrySource).toBe('gps');
  });
});
