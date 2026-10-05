import { useCallback, useRef, useState } from 'react';

import { locationErrorCode, type LocationErrorCode } from '@/application/ports/location';
import type { Dictionary } from '@/shared/i18n/dictionaries';
import { useI18n } from '@/shared/i18n/i18n-context';

import { useDependencies } from './dependencies-context';
import { useUpdatePreferences } from './use-preferences';

export type LocationRequestStatus = 'idle' | 'requesting' | 'success' | 'error';
export type { LocationErrorCode };

export interface UseRequestLocationResult {
  status: LocationRequestStatus;
  errorCode: LocationErrorCode | null;
  /** País resuelto en la última detección exitosa; `null` si aún no hay. */
  detectedCountry: string | null;
  /** Mensaje localizado del último error; `null` si no hay error. */
  message: string | null;
  requestLocation: () => void;
  reset: () => void;
}

function errorMessage(code: LocationErrorCode, t: Dictionary): string {
  switch (code) {
    case 'denied':
      return t.location.errorDenied;
    case 'unavailable':
      return t.location.errorUnavailable;
    case 'timeout':
      return t.location.errorTimeout;
    case 'unsupported':
      return t.location.errorUnsupported;
    case 'network':
      return t.location.errorNetwork;
    case 'http':
    case 'invalid-response':
      return t.location.errorLookup;
    case 'unknown':
      return t.location.errorUnknown;
  }
}

/**
 * Solicita la ubicación solo cuando el usuario lo pide explícitamente y, al
 * resolver el país, lo guarda como preferencia con `countrySource: 'gps'`.
 * Nunca dispara el permiso al montar: eso evita el bloqueo automático (CA-09.2).
 *
 * La resolución GPS + geocodificación se inyecta por `DependenciesContext`
 * (R-03): el hook no conoce los clientes concretos de infraestructura.
 */
export function useRequestLocation(): UseRequestLocationResult {
  const { t } = useI18n();
  const { telemetry, resolveCountry } = useDependencies();
  const updatePreferences = useUpdatePreferences();
  const [status, setStatus] = useState<LocationRequestStatus>('idle');
  const [errorCode, setErrorCode] = useState<LocationErrorCode | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const requestInFlight = useRef(false);

  const requestLocation = useCallback(() => {
    if (requestInFlight.current) {
      return;
    }

    requestInFlight.current = true;
    setStatus('requesting');
    setErrorCode(null);

    void resolveCountry()
      .then(async ({ country }) => {
        setDetectedCountry(country);
        await updatePreferences({ country, countrySource: 'gps' });
        setStatus('success');
        void telemetry.track('gps_used', { country });
      })
      .catch((error: unknown) => {
        setErrorCode(locationErrorCode(error));
        setStatus('error');
      })
      .finally(() => {
        requestInFlight.current = false;
      });
  }, [resolveCountry, updatePreferences, telemetry]);

  const reset = useCallback(() => {
    setStatus('idle');
    setErrorCode(null);
    setDetectedCountry(null);
  }, []);

  return {
    status,
    errorCode,
    detectedCountry,
    message: errorCode === null ? null : errorMessage(errorCode, t),
    requestLocation,
    reset,
  };
}
