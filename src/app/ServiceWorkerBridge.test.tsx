import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ServiceWorkerBridge } from './ServiceWorkerBridge';

type MessageListener = (event: MessageEvent) => void;

function stubServiceWorker() {
  const listeners = new Set<MessageListener>();
  const serviceWorker = {
    addEventListener: vi.fn((type: string, listener: MessageListener) => {
      if (type === 'message') {
        listeners.add(listener);
      }
    }),
    removeEventListener: vi.fn((type: string, listener: MessageListener) => {
      if (type === 'message') {
        listeners.delete(listener);
      }
    }),
  };

  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: serviceWorker });

  return {
    dispatch(data: unknown) {
      for (const listener of listeners) {
        listener(new MessageEvent('message', { data }));
      }
    },
    listeners,
  };
}

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="path">{location.pathname}</p>;
}

function renderBridge() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <ServiceWorkerBridge />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ServiceWorkerBridge', () => {
  it('navega al deep link cuando el service worker avisa del clic', () => {
    const { dispatch } = stubServiceWorker();
    renderBridge();

    act(() => {
      dispatch({ type: 'navigate', url: '/shows/7' });
    });

    expect(screen.getByTestId('path')).toHaveTextContent('/shows/7');
  });

  it('avisa el clic de la notificación antes de navegar (notification_open)', () => {
    const { dispatch } = stubServiceWorker();
    const onNotificationOpen = vi.fn();

    render(
      <MemoryRouter initialEntries={['/']}>
        <ServiceWorkerBridge onNotificationOpen={onNotificationOpen} />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    act(() => {
      dispatch({ type: 'navigate', url: '/shows/7' });
    });

    expect(onNotificationOpen).toHaveBeenCalledWith('/shows/7');
    expect(screen.getByTestId('path')).toHaveTextContent('/shows/7');
  });

  it('ignora mensajes con forma incorrecta o URLs externas', () => {
    const { dispatch } = stubServiceWorker();
    renderBridge();

    act(() => {
      dispatch({ type: 'navigate', url: 'https://ejemplo-externo.com' });
      dispatch({ type: 'otro', url: '/shows/7' });
      dispatch(null);
      dispatch('navigate');
    });

    expect(screen.getByTestId('path')).toHaveTextContent('/');
  });

  it('deja de escuchar mensajes al desmontarse', () => {
    const { listeners } = stubServiceWorker();
    const { unmount } = renderBridge();

    expect(listeners.size).toBe(1);

    unmount();

    expect(listeners.size).toBe(0);
  });
});
