import { goToTab, openGilmoreGirlsDetail } from './fixtures/app-actions';
import { expect, test } from './fixtures/test';

test.describe('Favoritos e historial (offline-first)', () => {
  test('añadir a favoritos persiste tras recargar y se puede quitar', async ({ page }) => {
    await openGilmoreGirlsDetail(page);

    const addButton = page.getByRole('button', { name: 'Añadir a favoritos' });
    await expect(addButton).toHaveAttribute('aria-pressed', 'false');
    await addButton.click();
    await expect(page.getByRole('button', { name: 'Quitar de favoritos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await goToTab(page, 'Favoritos');
    await expect(page.getByRole('link', { name: /Gilmore Girls/ })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('link', { name: /Gilmore Girls/ })).toBeVisible();

    await page.getByRole('button', { name: 'Quitar de favoritos' }).click();
    await expect(page.getByRole('heading', { name: 'Todavía no tienes favoritos' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Todavía no tienes favoritos' })).toBeVisible();
  });

  test('la visita al detalle se registra en el historial', async ({ page }) => {
    await openGilmoreGirlsDetail(page);

    await goToTab(page, 'Historial');

    await expect(page.getByRole('heading', { level: 1, name: 'Historial' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Vistos' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Gilmore Girls/ })).toBeVisible();
  });
});
