// Capturas de evidencia de Epix (preview de producción en :4173)
// Uso: node capture.mjs   (desde /tmp/opencode/epix-smoke donde vive playwright-core)
import { chromium } from 'playwright-core';

const BASE = 'http://localhost:4173';
const OUT = '/home/fabian/Documents/Proyectos de Programación/Epix/docs/evidencias/capturas';
const DIAGRAMS = '/home/fabian/Documents/Proyectos de Programación/Epix/docs/diagramas';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
  locale: 'es-CO',
});
const page = await context.newPage();
const log = (m) => console.log(`✓ ${m}`);

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  log(`captura ${name}.png`);
}

try {
  // 1) Inicio
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await shot('01-inicio');

  // 2) Buscar (escribir y esperar resultados)
  await page.goto(`${BASE}/search`, { waitUntil: 'networkidle' });
  const input = page.getByRole('searchbox').or(page.getByPlaceholder(/buscar/i)).first();
  await input.fill('girls');
  await page.waitForSelector('a[href^="/shows/"]', { timeout: 20000 });
  await page.waitForTimeout(600);
  await shot('02-buscar-resultados');

  // 3) Detalle + favorito
  await page.locator('a[href^="/shows/"]').first().click();
  await page.waitForURL(/\/shows\/\d+/, { timeout: 20000 });
  await page.waitForTimeout(1200);
  await shot('03-detalle');
  const heart = page.getByRole('button', { name: /favorit/i }).first();
  if (await heart.count()) {
    await heart.click();
    await page.waitForTimeout(700);
    await shot('04-detalle-favorito');
  }

  // 4) Agenda
  await page.goto(`${BASE}/schedule`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await shot('05-agenda');

  // 5) Favoritos e historial
  await page.goto(`${BASE}/favorites`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await shot('06-favoritos');
  await page.goto(`${BASE}/history`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await shot('07-historial');

  // 6) Perfil: activar telemetría y usar la app
  await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const telemetry = page.getByRole('switch').filter({ hasText: /telemetr/i }).first();
  if (await telemetry.count()) {
    await telemetry.click();
    await page.waitForTimeout(400);
  } else {
    const byLabel = page.getByLabel(/telemetr/i).first();
    if (await byLabel.count()) await byLabel.click();
  }
  await page.waitForTimeout(400);
  await shot('08-perfil');
  await page.goto(`${BASE}/search`, { waitUntil: 'networkidle' });
  const input2 = page.getByRole('searchbox').or(page.getByPlaceholder(/buscar/i)).first();
  await input2.fill('breaking');
  await page.waitForSelector('a[href^="/shows/"]', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);

  // 7) Mi actividad
  await page.goto(`${BASE}/activity`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await shot('09-mi-actividad');

  // 8) Diagramas (desktop, página completa)
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.5 });
  const dpage = await desktop.newPage();
  await dpage.goto(`file://${DIAGRAMS}/epix-arquitectura-offline-first.html`);
  await dpage.waitForTimeout(1500);
  await dpage.screenshot({ path: `${OUT}/10-diagrama-arquitectura.png`, fullPage: true });
  log('captura 10-diagrama-arquitectura.png');
  await dpage.goto(`file://${DIAGRAMS}/epix-sync-favoritos.html`);
  await dpage.waitForTimeout(1500);
  await dpage.screenshot({ path: `${OUT}/11-diagrama-sync.png`, fullPage: true });
  log('captura 11-diagrama-sync.png');
  await desktop.close();
} catch (error) {
  console.error('ERROR en captura:', error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
