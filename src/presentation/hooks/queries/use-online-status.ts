import { useEffect, useState } from 'react';

function getInitialOnlineStatus(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

/** Sigue el estado de conexión del navegador (`online` / `offline`). */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(getInitialOnlineStatus);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
