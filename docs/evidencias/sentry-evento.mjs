/**
 * Verificación end-to-end de Sentry en producción:
 *  1) El build desplegado carga el SDK (sin DSN no lo hacía).
 *  2) Se lanza un error real en la app de producción y se envía a Sentry.
 *  3) El evento aparece en el panel de Sentry (captura de evidencia).
 */
import { chromium } from 'playwright-core';

const APP = 'https://epix-xi.vercel.app';
const OUT = '/home/fabian/Documents/Proyectos de Programación/Epix/docs/evidencias/capturas';
const MARCA = `Verificación Epix: evento de prueba (${new Date().toISOString().slice(0, 16)})`;

// ── 1. App de producción: SDK activo + envío del error ─────────────────────────
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-CO' });
const page = await ctx.newPage();
const sentryRequests = [];
page.on('request', (r) => {
  if (r.url().includes('sentry.io')) sentryRequests.push(r.url().slice(0, 100));
});

await page.goto(APP, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(4000);
const sdkActivo = await page.evaluate(() => '__SENTRY__' in window && Boolean(window.__SENTRY__));
console.log('SDK Sentry activo en producción:', sdkActivo ? '✅' : '❌');

await page.evaluate((marca) => {
  setTimeout(() => {
    throw new Error(marca);
  }, 0);
}, MARCA);
console.log('💥 Error de prueba lanzado en el navegador');
await page.waitForTimeout(8000);
console.log('peticiones a sentry.io:', sentryRequests.length, sentryRequests.slice(0, 3));
await browser.close();

// ── 2. Panel de Sentry: el evento debe aparecer ────────────────────────────────
const ctx2 = await chromium.launchPersistentContext('/tmp/opencode/sentry-profile', {
  channel: 'chrome', headless: true, viewport: { width: 1280, height: 900 },
});
const panel = ctx2.pages()[0] ?? (await ctx2.newPage());
await panel.goto('https://epix-ct.sentry.io/issues/?query=Verificaci%C3%B3n%20Epix', {
  waitUntil: 'domcontentloaded', timeout: 90000,
});

let aparecio = false;
for (let i = 0; i < 20 && !aparecio; i++) {
  await panel.waitForTimeout(4000);
  const texto = await panel.locator('body').innerText().catch(() => '');
  aparecio = texto.includes('Verificación Epix');
  console.log(`⏳ esperando el evento en el panel… (${i + 1}/20) ${aparecio ? '¡apareció!' : ''}`);
  if (!aparecio && i === 9) {
    await panel.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  }
}

await panel.screenshot({ path: `${OUT}/20-sentry-evento.png` });
console.log(aparecio ? '🏆 Evento confirmado en el panel de Sentry' : '⚠️ No apareció todavía (revisar manualmente)');
await ctx2.close();
process.exit(aparecio ? 0 : 1);
