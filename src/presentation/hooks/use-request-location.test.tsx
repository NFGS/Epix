import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ResolvedCountry } from '@/application/use-cases/resolve-country';
import { GeoError } from '@/infrastructure/geo/geolocation';
import { ReverseGeocodeError } from '@/infrastructure/geo/reverse-geocode';
import { DependenciesContext } from '@/presentation/hooks/dependencies-context';
import { I18nProvider } from '@/shared/i18n/I18nProvider';
import { createTestDependencies, type TestDependencies } from '@/test/test-dependencies';

import { useRequestLocation, type UseRequestLocationOptions } from './use-request-location';

function createWrapper(dependencies: TestDependencies) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <DependenciesContext.Provider value={dependencies}>
        <I18nProvider>{children}</I18nProvider>
      </DependenciesContext.Provider>
    );
  };
}

function renderRequestLocation(dependencies: TestDependencies, options: UseRequestLocationOptions) {
  return renderHook(() => useRequestLocation(options), {
    wrapper: createWrapper(dependencies),
  });
}

describe('useRequestLocation', () => {
  it('persiste el país con origen gps cuando la detección tiene éxito', async () => {
    const dependencies = createTestDependencies();
    const resolveCountryFn = vi.fn(async (): Promise<ResolvedCountry> => ({
      country: 'CO',
      source: 'gps',
    }));
    const { result } = renderRequestLocation(dependencies, { resolveCountryFn });

    act(() => {
      result.current.requestLocation();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    expect(result.current.detectedCountry).toBe('CO');
    expect(result.current.message).toBeNull();

    await waitFor(async () => {
      const record = await dependencies.db.preferences.get('app');
      expect(record).toMatchObject({ country: 'CO', countrySource: 'gps' });
    });
  });

  it('expone el mensaje de permiso denegado sin tocar las preferencias', async () => {
    const dependencies = createTestDependencies();
    const resolveCountryFn = vi.fn(async () => {
      throw new GeoError('denied');
    });
    const { result } = renderRequestLocation(dependencies, { resolveCountryFn });

    act(() => {
      result.current.requestLocation();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.errorCode).toBe('denied');
    expect(result.current.message).toBe('Permiso denegado. Elige tu país manualmente en Agenda.');
    expect(await dependencies.db.preferences.get('app')).toBeUndefined();
  });

  it('traduce el error de red de la geocodificación a un mensaje accionable', async () => {
    const dependencies = createTestDependencies();
    const resolveCountryFn = vi.fn(async () => {
      throw new ReverseGeocodeError('network');
    });
    const { result } = renderRequestLocation(dependencies, { resolveCountryFn });

    act(() => {
      result.current.requestLocation();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.errorCode).toBe('network');
    expect(result.current.message).toContain('Elige tu país manualmente en Agenda.');
  });

  it('ignora una segunda solicitud mientras la primera sigue en curso', async () => {
    const dependencies = createTestDependencies();
    let succeed: ((value: ResolvedCountry) => void) | null = null;
    const resolveCountryFn = vi.fn(
      () =>
        new Promise<ResolvedCountry>((resolve) => {
          succeed = resolve;
        }),
    );
    const { result } = renderRequestLocation(dependencies, { resolveCountryFn });

    act(() => {
      result.current.requestLocation();
      result.current.requestLocation();
    });

    expect(result.current.status).toBe('requesting');
    expect(resolveCountryFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      succeed?.({ country: 'CO', source: 'gps' });
    });
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
  });
});
