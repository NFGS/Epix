import { useEffect, useRef } from 'react';

import type { TelemetryPort } from '@/domain/ports/telemetry';

export interface TelemetryBootstrapProps {
  telemetry: TelemetryPort;
}

/**
 * Registra `session_start` una vez por montaje del árbol de la app (arranque).
 * El servicio decide si se guarda según el consentimiento (CA-11.2).
 */
export function TelemetryBootstrap({ telemetry }: TelemetryBootstrapProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) {
      return;
    }

    tracked.current = true;
    void telemetry.track('session_start');
  }, [telemetry]);

  return null;
}
