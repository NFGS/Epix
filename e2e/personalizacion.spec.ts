import { expect, test } from './fixtures/test';

test.describe('Personalización de contenido (RF-05)', () => {
  test('un género favorito oculta los resultados que no lo cumplen', async ({ page }) => {
    await page.goto('/profile');
    const comedyChip = page.getByRole('button', { name: 'Comedy', exact: true });
    await expect(comedyChip).toHaveAttribute('aria-pressed', 'false');
    await comedyChip.click();
    await expect(comedyChip).toHaveAttribute('aria-pressed', 'true');

    await page.goto('/search');
    await page.getByRole('searchbox', { name: 'Buscar series' }).fill('girls');

    await expect(page.getByText('1 resultado para «girls»')).toBeVisible();
    await expect(page.getByText('1 oculto por tus filtros')).toBeVisible();
    await expect(page.getByRole('link', { name: /Gilmore Girls/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Girls/ })).toHaveCount(0);
  });

  test('la preferencia de género persiste tras recargar', async ({ page }) => {
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Comedy', exact: true }).click();

    await page.reload();

    await expect(page.getByRole('button', { name: 'Comedy', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
