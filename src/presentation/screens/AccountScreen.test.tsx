import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AuthError } from '@/application/ports/auth';
import { DependenciesContext } from '@/presentation/hooks/dependencies-context';
import { I18nProvider } from '@/shared/i18n/I18nProvider';
import { createFakeAuth, type FakeAuth } from '@/test/fake-auth';
import { createTestDependencies, type TestDependencies } from '@/test/test-dependencies';

import { AccountScreen } from './AccountScreen';

const LINKED = { id: 'user-1', email: 'ana@example.com' };

function renderAccount(deps: TestDependencies) {
  render(
    <DependenciesContext.Provider value={deps}>
      <I18nProvider>
        <MemoryRouter>
          <AccountScreen />
        </MemoryRouter>
      </I18nProvider>
    </DependenciesContext.Provider>,
  );

  return deps;
}

function anonymousDeps(fake: FakeAuth): TestDependencies {
  vi.mocked(fake.auth.getUser).mockResolvedValue({ id: 'user-1', email: null });
  return createTestDependencies({ auth: fake.auth });
}

describe('AccountScreen · estados de la cuenta', () => {
  it('sin configurar explica el modo local y no muestra formulario', async () => {
    renderAccount(createTestDependencies());

    expect(screen.getByRole('heading', { level: 1, name: 'Cuenta' })).toBeInTheDocument();
    expect(screen.getByText('La nube no está configurada')).toBeInTheDocument();
    expect(screen.queryByLabelText('Correo electrónico')).not.toBeInTheDocument();
  });

  it('anónima muestra «Protege tu cuenta» y envía el código de vinculación', async () => {
    const user = userEvent.setup();
    const fake = createFakeAuth();
    renderAccount(anonymousDeps(fake));

    expect(await screen.findByText('Protege tu cuenta')).toBeInTheDocument();
    expect(
      screen.getByText(/Vincula tu cuenta aquí primero; luego inicia sesión con tu correo/),
    ).toBeInTheDocument();

    const emailInput = screen.getByLabelText('Correo electrónico');
    await waitFor(() => {
      expect(emailInput).toHaveFocus();
    });

    await user.type(emailInput, 'ana@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));

    expect(fake.auth.linkEmail).toHaveBeenCalledWith('ana@example.com');

    const codeInput = await screen.findByLabelText('Código de verificación');
    expect(codeInput).toHaveAttribute('inputmode', 'numeric');
    expect(codeInput).toHaveAttribute('autocomplete', 'one-time-code');
    expect(codeInput).toHaveFocus();
  });

  it('el flujo de verificación termina en «Cuenta protegida»', async () => {
    const user = userEvent.setup();
    const fake = createFakeAuth();
    vi.mocked(fake.auth.verifyEmailChange).mockImplementation(async () => {
      fake.emit({ ...LINKED });
      return { ...LINKED };
    });
    renderAccount(anonymousDeps(fake));

    await user.type(await screen.findByLabelText('Correo electrónico'), 'ana@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));
    await user.type(await screen.findByLabelText('Código de verificación'), '12345678');
    await user.click(screen.getByRole('button', { name: 'Verificar' }));

    expect(await screen.findByText('Cuenta protegida')).toBeInTheDocument();
    expect(screen.getByText('Sesión iniciada como ana@example.com')).toBeInTheDocument();
    expect(
      screen.getByText('Tu cuenta quedó protegida. Ya puedes iniciar sesión en tus otros dispositivos.'),
    ).toBeInTheDocument();
    expect(fake.auth.verifyEmailChange).toHaveBeenCalledWith('ana@example.com', '12345678');
  });

  it('signed-out ofrece iniciar sesión con sendEmailOtp', async () => {
    const user = userEvent.setup();
    const fake = createFakeAuth();
    renderAccount(createTestDependencies({ auth: fake.auth }));

    expect(await screen.findByText('Inicia sesión')).toBeInTheDocument();
    expect(screen.getByText(/Este dispositivo quedó limpio por seguridad/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));

    expect(fake.auth.sendEmailOtp).toHaveBeenCalledWith('ana@example.com');
  });

  it('con cuenta muestra el correo y el cierre de sesión pide confirmación', async () => {
    const user = userEvent.setup();
    const fake = createFakeAuth();
    vi.mocked(fake.auth.getUser).mockResolvedValue({ ...LINKED });
    renderAccount(createTestDependencies({ auth: fake.auth }));

    expect(await screen.findByText('Sesión iniciada como ana@example.com')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Cerrar sesión/ }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('¿Cerrar sesión?')).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Se borrarán de este dispositivo tus favoritos, historial/),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Cerrar sesión' }));

    await waitFor(() => {
      expect(fake.auth.signOut).toHaveBeenCalledTimes(1);
    });
    expect(
      await screen.findByText('Cerraste sesión y borramos los datos de este dispositivo.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Inicia sesión')).toBeInTheDocument();
  });

  it('un código inválido muestra el error legible con role alert', async () => {
    const user = userEvent.setup();
    const fake = createFakeAuth({
      verifyEmailChange: vi.fn(async () => {
        throw new AuthError('invalid-code', 'código incorrecto');
      }),
    });
    renderAccount(anonymousDeps(fake));

    await user.type(await screen.findByLabelText('Correo electrónico'), 'ana@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));
    await user.type(await screen.findByLabelText('Código de verificación'), '000000');
    await user.click(screen.getByRole('button', { name: 'Verificar' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('El código no es correcto. Revísalo e inténtalo de nuevo.');
  });

  it('en el paso de código se puede volver a usar otro correo', async () => {
    const user = userEvent.setup();
    const fake = createFakeAuth();
    renderAccount(anonymousDeps(fake));

    await user.type(await screen.findByLabelText('Correo electrónico'), 'ana@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));
    await user.click(await screen.findByRole('button', { name: 'Usar otro correo' }));

    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.queryByLabelText('Código de verificación')).not.toBeInTheDocument();
  });
});
