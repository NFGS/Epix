import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SLOW_LOADING_MS, useSlowLoading } from './use-slow-loading';

describe('useSlowLoading', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('marca lento tras el umbral y se reinicia al terminar (R-12)', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ isLoading }) => useSlowLoading(isLoading), {
      initialProps: { isLoading: true },
    });

    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(SLOW_LOADING_MS);
    });
    expect(result.current).toBe(true);

    rerender({ isLoading: false });
    expect(result.current).toBe(false);

    rerender({ isLoading: true });
    expect(result.current).toBe(false);
  });
});
