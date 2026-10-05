import { expect, test } from './fixtures/test';

test.describe('Navegación y estados base', () => {
  test('Inicio carga la programación de hoy', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: 'Hoy en TV' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Emisiones de hoy' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Riverdale/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /The Office/ })).toBeVisible();
  });

  test('la barra inferior navega por las cinco pestañas', async ({ page }) => {
    await page.goto('/');
    const bottomNav = page.getByRole('navigation', { name: 'Navegación principal' });

    await bottomNav.getByRole('link', { name: 'Buscar' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Buscar' })).toBeVisible();

    await bottomNav.getByRole('link', { name: 'Agenda' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible();

    await bottomNav.getByRole('link', { name: 'Favoritos' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Favoritos' })).toBeVisible();

    await bottomNav.getByRole('link', { name: 'Historial' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Historial' })).toBeVisible();

    await bottomNav.getByRole('link', { name: 'Inicio' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Hoy en TV' })).toBeVisible();
  });

  test('el encabezado abre Perfil', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Abrir perfil' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Perfil' })).toBeVisible();
  });

  test('una ruta desconocida muestra el estado 404', async ({ page }) => {
    await page.goto('/ruta-que-no-existe');

    await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
    await expect(page.getByText('La ruta que buscas no existe o fue movida.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Volver al inicio' })).toBeVisible();
  });
});
