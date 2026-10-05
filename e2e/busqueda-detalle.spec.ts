import { expect, test } from './fixtures/test';

test.describe('Búsqueda y detalle de serie', () => {
  test('la búsqueda «girls» muestra las dos tarjetas y su contador', async ({ page }) => {
    await page.goto('/search');

    await page.getByRole('searchbox', { name: 'Buscar series' }).fill('girls');

    await expect(page.getByText('2 resultados para «girls»')).toBeVisible();
    await expect(page.getByRole('link', { name: /Gilmore Girls/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Girls/ })).toBeVisible();
  });

  test('el detalle muestra sinopsis, géneros y episodios por temporada', async ({ page }) => {
    await page.goto('/search');
    await page.getByRole('searchbox', { name: 'Buscar series' }).fill('girls');
    await expect(page.getByText('2 resultados para «girls»')).toBeVisible();

    await page.getByRole('link', { name: /Gilmore Girls/ }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Gilmore Girls' })).toBeVisible();
    await expect(page.getByText('Stars Hollow')).toBeVisible();
    await expect(page.getByText('Comedy', { exact: true })).toBeVisible();
    await expect(page.getByText('Drama', { exact: true })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Episodios' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Temporada 1' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Temporada 2' })).toBeVisible();
    await expect(page.getByText('Pilot', { exact: true })).toBeVisible();
  });
});
