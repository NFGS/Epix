import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import type { TelemetryPort } from '@/domain/ports/telemetry';

export interface RouteTelemetryProps {
  telemetry: TelemetryPort;
}

/** Registra `screen_view` con el path en cada cambio de ruta. */
export function RouteTelemetry({ telemetry }: RouteTelemetryProps) {
  const { pathname } = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (lastPath.current === pathname) {
      return;
    }

    lastPath.current = pathname;
    void telemetry.track('screen_view', { path: pathname });
  }, [pathname, telemetry]);

  return null;
}
