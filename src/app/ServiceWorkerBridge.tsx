import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface NavigateMessage {
  type: 'navigate';
  url: string;
}

function isNavigateMessage(data: unknown): data is NavigateMessage {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const { type, url } = data as { type?: unknown; url?: unknown };
  return type === 'navigate' && typeof url === 'string' && url.startsWith('/');
}

/**
 * Escucha mensajes del service worker y navega en la ventana ya abierta cuando
 * el usuario toca una notificación. Sin esto, `postMessage` no tendría efecto.
 */
export function ServiceWorkerBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (isNavigateMessage(event.data)) {
        navigate(event.data.url);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [navigate]);

  return null;
}
