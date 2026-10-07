import { expect, test } from './fixtures/test';

test.describe('Cuenta (Sprint 5.2)', () => {
  test('Perfil enlaza a la pantalla de Cuenta', async ({ page }) => {
    await page.goto('/profile');

    await page.getByRole('link', { name: 'Gestionar' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Cuenta' })).toBeVisible();
  });

  test('la pantalla resuelve el estado de la nube', async ({ page }) => {
    await page.goto('/account');
    await expect(page.getByRole('heading', { level: 1, name: 'Cuenta' })).toBeVisible();

    // En CI no existen VITE_SUPABASE_*: siempre se muestra «La nube no está
    // configurada». En local (build con .env) la nube está activa y aparece el
    // formulario de correo (anónima o sin sesión). Ambos son estados válidos.
    const unconfigured = page.getByText('La nube no está configurada');
    const email = page.getByLabel('Correo electrónico');

    await expect(unconfigured.or(email).first()).toBeVisible({ timeout: 15_000 });

    if (await unconfigured.isVisible()) {
      await expect(page.getByText(/modo local/i)).toBeVisible();
    } else {
      await expect(email).toBeVisible();
    }
  });
});
