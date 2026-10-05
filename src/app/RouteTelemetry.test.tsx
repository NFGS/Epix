import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { TelemetryPort } from '@/domain/ports/telemetry';

import { RouteTelemetry } from './RouteTelemetry';
import { TelemetryBootstrap } from './TelemetryBootstrap';

function createTelemetry() {
  const track = vi.fn(async () => undefined);
  const telemetry = { track } satisfies TelemetryPort;
  return { telemetry, track };
}

function Navigator() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        void navigate('/search');
      }}
    >
      navegar
    </button>
  );
}

describe('TelemetryBootstrap · session_start', () => {
  it('registra session_start una sola vez por montaje', () => {
    const { telemetry, track } = createTelemetry();
    const { rerender } = render(<TelemetryBootstrap telemetry={telemetry} />);

    expect(track).toHaveBeenCalledWith('session_start');
    expect(track).toHaveBeenCalledTimes(1);

    rerender(<TelemetryBootstrap telemetry={telemetry} />);
    expect(track).toHaveBeenCalledTimes(1);
  });
});

describe('RouteTelemetry · screen_view', () => {
  it('registra el path inicial y cada cambio de ruta', async () => {
    const user = userEvent.setup();
    const { telemetry, track } = createTelemetry();

    render(
      <MemoryRouter initialEntries={['/']}>
        <RouteTelemetry telemetry={telemetry} />
        <Navigator />
      </MemoryRouter>,
    );

    expect(track).toHaveBeenCalledWith('screen_view', { path: '/' });

    await user.click(screen.getByRole('button', { name: 'navegar' }));

    expect(track).toHaveBeenCalledWith('screen_view', { path: '/search' });
    expect(track).toHaveBeenCalledTimes(2);
  });
});
