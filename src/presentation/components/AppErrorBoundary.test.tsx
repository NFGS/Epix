import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { reportError } from '@/infrastructure/observability/error-reporting';

import { AppErrorBoundary } from './AppErrorBoundary';

vi.mock('@/infrastructure/observability/error-reporting', () => ({
  reportError: vi.fn(),
}));

function Bomb(): never {
  throw new Error('boom de render');
}

function Healthy() {
  return <p>Todo bien</p>;
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    vi.mocked(reportError).mockClear();
    // React imprime el error capturado por consola: ruido esperado en el test.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('muestra el fallback accesible y reporta el error cuando un hijo lanza', () => {
    render(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Algo salió mal');
    expect(alert).toHaveTextContent('Recarga la página para continuar');
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument();

    expect(reportError).toHaveBeenCalledTimes(1);
    expect(vi.mocked(reportError).mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });

  it('el botón «Recargar» recarga la página', async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });

    render(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>,
    );

    await user.click(screen.getByRole('button', { name: 'Recargar' }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('sin errores renderiza a los hijos y no reporta nada', () => {
    render(
      <AppErrorBoundary>
        <Healthy />
      </AppErrorBoundary>,
    );

    expect(screen.getByText('Todo bien')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(reportError).not.toHaveBeenCalled();
  });
});
