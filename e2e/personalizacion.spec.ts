import type { Page } from '@playwright/test';

import { expect, test } from './fixtures/test';

/**
 * Espera a que la preferencia quede realmente persistida en IndexedDB.
 * Los chips aplican el cambio en la UI al instante (optimistas), así que este
 * helper evita recargas/navegaciones prematuras que abortarían la transacción.
 */
async function waitForGenrePersisted(page: Page, genre: string): Promise<void> {
  await page.waitForFunction(
    (expected) =>
      new Promise<boolean>((resolve) => {
        const open = indexedDB.open('epix');
        open.onerror = () => {
          resolve(false);
        };
        open.onsuccess = () => {
          try {
            const db = open.result;
            const request = db
              .transaction('preferences', 'readonly')
              .objectStore('preferences')
              .get('app');
            request.onerror = () => {
              resolve(false);
            };
            request.onsuccess = () => {
              const record = request.result as { favoriteGenres?: string[] } | undefined;
              const genres = record?.favoriteGenres ?? [];
              db.close();
              resolve(genres.includes(expected));
            };
          } catch {
            resolve(false);
          }
        };
      }),
    genre,
  );
}

test.describe('Personalización de contenido (RF-05)', () => {
  test('un género favorito oculta los resultados que no lo cumplen', async ({ page }) => {
    await page.goto('/profile');
    const comedyChip = page.getByRole('button', { name: 'Comedy', exact: true });
    await expect(comedyChip).toHaveAttribute('aria-pressed', 'false');
    await comedyChip.click();
    await expect(comedyChip).toHaveAttribute('aria-pressed', 'true');
    await waitForGenrePersisted(page, 'Comedy');

    await page.goto('/search');
    await page.getByRole('searchbox', { name: 'Buscar series' }).fill('girls');

    await expect(page.getByText('1 resultado para «girls»')).toBeVisible();
    await expect(page.getByText('1 oculto por tus filtros')).toBeVisible();
    await expect(page.getByRole('link', { name: /Gilmore Girls/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Girls/ })).toHaveCount(0);
  });

  test('la preferencia de género persiste tras recargar', async ({ page }) => {
    await page.goto('/profile');
    const comedyChip = page.getByRole('button', { name: 'Comedy', exact: true });
    await comedyChip.click();
    await expect(comedyChip).toHaveAttribute('aria-pressed', 'true');
    await waitForGenrePersisted(page, 'Comedy');

    await page.reload();

    await expect(page.getByRole('button', { name: 'Comedy', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
