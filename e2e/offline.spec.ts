import type { Page } from '@playwright/test';

import { goToTab, openGilmoreGirlsDetail } from './fixtures/app-actions';
import { expect, test } from './fixtures/test';

test.use({ serviceWorkers: 'allow' });

async function waitForServiceWorkerControl(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

test.describe('Modo offline (service worker + IndexedDB)', () => {
  test('el app shell y los favoritos siguen disponibles sin conexión', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Hoy en TV' })).toBeVisible();
    await waitForServiceWorkerControl(page);

    await openGilmoreGirlsDetail(page);
    await page.getByRole('button', { name: 'Añadir a favoritos' }).click();
    await expect(page.getByRole('button', { name: 'Quitar de favoritos' })).toBeVisible();

    await goToTab(page, 'Favoritos');
    await expect(page.getByRole('link', { name: /Gilmore Girls/ })).toBeVisible();

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByText('Sin conexión — mostrando lo guardado')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Gilmore Girls/ })).toBeVisible();

    await context.setOffline(false);
  });

  test('Inicio avisa cuando no hay conexión', async ({ page, context }) => {
    await page.goto('/');
    await waitForServiceWorkerControl(page);

    await context.setOffline(true);
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: 'Hoy en TV' })).toBeVisible();
    await expect(page.getByText('Sin conexión — mostrando lo guardado')).toBeVisible();

    await context.setOffline(false);
  });
});
