import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Switch } from './Switch';

describe('Switch (R-11)', () => {
  it('expone el estado con aria-checked y alterna al hacer clic', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onCheckedChange} label="Notificaciones" />);

    const toggle = screen.getByRole('switch', { name: 'Notificaciones' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await userEvent.click(toggle);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('envía false cuando está activado', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked onCheckedChange={onCheckedChange} label="Telemetría" />);

    await userEvent.click(screen.getByRole('switch', { name: 'Telemetría' }));

    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });
});
