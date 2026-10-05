import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { isInternalUrl } from '@/shared/lib/is-internal-url';

interface NavigateMessage {
  type: 'navigate';
  url: string;
}

export interface ServiceWorkerBridgeProps {
  /** Notifica el clic en una notificación local (para telemetría). */
  onNotificationOpen?: (url: string) => void;
}

function isNavigateMessage(data: unknown): data is NavigateMessage {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const { type, url } = data as { type?: unknown; url?: unknown };
  return type === 'navigate' && typeof url === 'string' && isInternalUrl(url);
}

/**
 * Escucha mensajes del service worker y navega en la ventana ya abierta cuando
 * el usuario toca una notificación. Sin esto, `postMessage` no tendría efecto.
 */
export function ServiceWorkerBridge({ onNotificationOpen }: ServiceWorkerBridgeProps = {}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (isNavigateMessage(event.data)) {
        onNotificationOpen?.(event.data.url);
        navigate(event.data.url);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [navigate, onNotificationOpen]);

  return null;
}
