// Verificación de producción de Epix con Chromium real
import { chromium } from 'playwright-core';

const BASE = 'https://epix-xi.vercel.app';
const OUT = '/home/fabian/Documents/Proyectos de Programación/Epix/docs/evidencias/capturas';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
  locale: 'es-CO',
});
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

try {
  // 1) Inicio de producción
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 });
  console.log('Título:', await page.title());
  const manifest = await page.getAttribute('link[rel="manifest"]', 'href');
  console.log('Manifest:', manifest ?? '(no encontrado)');

  // 2) Service worker activo
  const swReady = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const timeout = new Promise((r) => setTimeout(() => r(false), 15000));
    const ready = navigator.serviceWorker.ready.then((reg) => Boolean(reg.active));
    return Promise.race([ready, timeout]);
  });
  console.log('Service Worker activo:', swReady);

  // 3) Deep link directo (SPA rewrite)
  const resp = await page.goto(`${BASE}/shows/169`, { waitUntil: 'networkidle', timeout: 60000 });
  console.log('Deep link /shows/169 →', resp?.status(), '· title:', await page.title());
  const hasShell = await page.locator('text=Epix').first().isVisible().catch(() => false);
  console.log('App shell visible en deep link:', hasShell);

  // 4) Capturas de evidencia
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/12-produccion-inicio.png` });
  console.log('✓ captura 12-produccion-inicio.png');

  await page.goto(`${BASE}/shows/169`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/13-produccion-deeplink.png` });
  console.log('✓ captura 13-produccion-deeplink.png');

  console.log('Errores de consola:', consoleErrors.length === 0 ? '0 ✓' : consoleErrors.slice(0, 6));
} catch (error) {
  console.error('ERROR verificando producción:', error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
