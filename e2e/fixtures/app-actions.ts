import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function searchGirls(page: Page): Promise<void> {
  await page.goto('/search');
  await page.getByRole('searchbox', { name: 'Buscar series' }).fill('girls');
  await expect(page.getByText('2 resultados para «girls»')).toBeVisible();
}

export async function openGilmoreGirlsDetail(page: Page): Promise<void> {
  await searchGirls(page);
  await page.getByRole('link', { name: /Gilmore Girls/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Gilmore Girls' })).toBeVisible();
}

export async function goToTab(page: Page, label: string): Promise<void> {
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: label })
    .click();
}
