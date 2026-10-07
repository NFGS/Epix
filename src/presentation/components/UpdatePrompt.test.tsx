import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@/shared/i18n/I18nProvider';
import { __resetPwaRegisterStub, __setPwaRegisterStub } from '@/test/pwa-register-stub';

import { UpdatePrompt } from './UpdatePrompt';

beforeEach(() => {
  __resetPwaRegisterStub();
});

function renderPrompt() {
  render(
    <I18nProvider>
      <UpdatePrompt />
    </I18nProvider>,
  );
}

describe('UpdatePrompt (nueva versión disponible)', () => {
  it('muestra el banner cuando el service worker reporta needRefresh', () => {
    __setPwaRegisterStub({ needRefresh: true });

    renderPrompt();

    expect(screen.getByRole('status')).toHaveTextContent('Hay una nueva versión de Epix');
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeInTheDocument();
  });

  it('el botón Actualizar llama a updateServiceWorker', async () => {
    const user = userEvent.setup();
    const updateServiceWorker = vi.fn(async () => undefined);
    __setPwaRegisterStub({ needRefresh: true, updateServiceWorker });

    renderPrompt();
    await user.click(screen.getByRole('button', { name: 'Actualizar' }));

    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('el botón cerrar oculta el banner', async () => {
    const user = userEvent.setup();
    __setPwaRegisterStub({ needRefresh: true });

    renderPrompt();
    await user.click(screen.getByRole('button', { name: 'Cerrar aviso' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
