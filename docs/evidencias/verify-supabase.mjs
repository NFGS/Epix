// Verificación end-to-end de Supabase en producción
// 1) activa telemetría 2) abre serie y marca favorito 3) sincroniza 4) captura evidencia
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
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

try {
  // 1) Activar telemetría en Perfil
  await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);
  const telemetry = page.getByRole('switch', { name: /telemetr/i }).first();
  if (await telemetry.count()) {
    const checked = await telemetry.getAttribute('aria-checked');
    if (checked !== 'true') await telemetry.click();
    console.log('Telemetría activada (aria-checked:', await telemetry.getAttribute('aria-checked'), ')');
  } else {
    console.log('⚠ no encontré el switch de telemetría');
  }

  // 2) Abrir serie y marcar favorito
  await page.goto(`${BASE}/shows/169`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  const heart = page.getByRole('button', { name: /favorit/i }).first();
  await heart.click();
  await page.waitForTimeout(800);
  console.log('Favorito marcado (aria-pressed:', await heart.getAttribute('aria-pressed'), ')');

  // 3) Sincronizar desde Perfil
  await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(600);
  const syncBtn = page.getByRole('button', { name: /sincronizar ahora/i }).first();
  const enabled = await syncBtn.isEnabled().catch(() => false);
  console.log('Botón "Sincronizar ahora" habilitado:', enabled);
  if (enabled) await syncBtn.click();
  // esperar chip "Al día" (hasta 25 s)
  let chip = '';
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(1000);
    const text = (await page.locator('main').innerText()).replace(/\n+/g, ' | ');
    if (/Al día/i.test(text)) { chip = 'Al día'; break; }
  }
  console.log('Estado de sincronización:', chip || '(sin confirmar)');
  console.log('Errores de consola:', errors.length ? errors.slice(0, 4) : '0 ✓');

  await page.screenshot({ path: `${OUT}/14-supabase-sincronizado.png` });
  console.log('✓ captura 14-supabase-sincronizado.png');
} catch (e) {
  console.error('ERROR:', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
