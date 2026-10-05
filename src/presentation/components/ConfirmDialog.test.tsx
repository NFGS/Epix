import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from './ConfirmDialog';

const baseProps = {
  title: '¿Vaciar todo el historial?',
  description: 'Se borrarán las series vistas y las búsquedas de este dispositivo.',
  confirmLabel: 'Vaciar',
  cancelLabel: 'Cancelar',
};

describe('ConfirmDialog', () => {
  it('renderiza el diálogo accesible y confirma la acción', async () => {
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog open {...baseProps} onConfirm={onConfirm} onCancel={vi.fn()} />,
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: 'Vaciar' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cierra con la tecla Escape', async () => {
    const onCancel = vi.fn();

    render(
      <ConfirmDialog open {...baseProps} onConfirm={vi.fn()} onCancel={onCancel} />,
    );

    await userEvent.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('no renderiza nada cuando está cerrado', () => {
    render(
      <ConfirmDialog open={false} {...baseProps} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('atrapa el foco con Tab y Shift+Tab dentro del diálogo (R-06)', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog open {...baseProps} onConfirm={vi.fn()} onCancel={vi.fn()} />);

    const cancel = screen.getByRole('button', { name: 'Cancelar' });
    const confirm = screen.getByRole('button', { name: 'Vaciar' });

    expect(cancel).toHaveFocus();

    await user.tab();
    expect(confirm).toHaveFocus();

    await user.tab();
    expect(cancel).toHaveFocus();

    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();
  });

  it('restaura el foco al disparador al cerrar (R-06)', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);

      return (
        <div>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
            }}
          >
            Abrir
          </button>
          <ConfirmDialog
            open={open}
            {...baseProps}
            onConfirm={vi.fn()}
            onCancel={() => {
              setOpen(false);
            }}
          />
        </div>
      );
    }

    render(<Harness />);

    const trigger = screen.getByRole('button', { name: 'Abrir' });
    await user.click(trigger);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });
});
