import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_DEBOUNCE_MS, useDebouncedValue } from './use-debounced-value';
import { useOnlineStatus } from './use-online-status';

describe('useDebouncedValue', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('retrasa el valor hasta que pasa el tiempo de espera', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'ab' });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS - 1);
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('ab');
  });

  it('reinicia el temporizador con cada cambio', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 400), {
      initialProps: { value: 'd' },
    });

    rerender({ value: 'da' });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    rerender({ value: 'dar' });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('d');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('dar');
  });
});

describe('useOnlineStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refleja los eventos online y offline del navegador', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);

    act(() => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });
});
