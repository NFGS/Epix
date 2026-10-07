import { expect, test } from './fixtures/test';

test.describe('Privacidad', () => {
  test('la ruta /privacy carga con su contenido y atribución', async ({ page }) => {
    await page.goto('/privacy');

    await expect(page.getByRole('heading', { level: 1, name: 'Privacidad' })).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: 'Qué se guarda en tu dispositivo' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Tus derechos' })).toBeVisible();
    await expect(
      page.getByRole('article').getByRole('link', { name: 'tvmaze.com' }),
    ).toHaveAttribute('href', 'https://www.tvmaze.com');
  });

  test('se navega desde el enlace de privacidad en Perfil', async ({ page }) => {
    await page.goto('/profile');

    await page.getByRole('link', { name: 'Leer política' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Privacidad' })).toBeVisible();
  });
});
