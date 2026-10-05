import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renderiza título y descripción', () => {
    render(<EmptyState title="Sin resultados" description="Prueba con otra búsqueda" />);

    expect(screen.getByRole('heading', { name: 'Sin resultados' })).toBeInTheDocument();
    expect(screen.getByText('Prueba con otra búsqueda')).toBeInTheDocument();
  });

  it('renderiza la acción opcional y ejecuta su callback', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <EmptyState
        title="Vacío"
        action={
          <button type="button" onClick={onAction}>
            Reintentar
          </button>
        }
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
