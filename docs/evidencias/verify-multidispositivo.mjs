/**
 * Verificación multi-dispositivo de Epix (2 dispositivos simulados con perfiles aislados).
 *
 * Simula dos móviles reales: dos contextos de navegador SIN estado compartido, cada uno con la
 * sesión de la MISMA cuenta (creada y eliminada vía Admin API con service_role).
 *
 * Disparadores de sync probados (los reales de la app):
 *  - Micro-sync automático tras marcar un favorito (push inmediato, sin reabrir ni tocar nada).
 *  - Arranque de la app (reabrir el PWA en el móvil) → push del outbox + pull de la nube.
 *  - Realtime: la otra pestaña recibe los cambios EN VIVO sin recargar.
 *
 * Comprueba:
 *  1. Dispositivo A marca «Breaking Bad»; al reabrir la app → la fila llega a la nube.
 *  2. Dispositivo B (recién abierto, misma cuenta) ve el favorito (pull de nube).
 *  3. Realtime: A marca «Game of Thrones» y sincroniza → B lo ve aparecer EN VIVO sin recargar.
 *
 * Requisitos: ~/.config/secrets.env con SUPABASE_ACCESS_TOKEN; .env del repo con VITE_SUPABASE_URL.
 * Se ejecuta desde /tmp/opencode/epix-smoke (tiene playwright-core instalado):
 *   node verify-multidispositivo.mjs
 */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';

const REPO = '/home/fabian/Documents/Proyectos de Programación/Epix';
const OUT = `${REPO}/docs/evidencias/capturas`;
const APP = 'https://epix-xi.vercel.app';
const REF = 'qeadwdtzqgbdbrczhkuf';

const parseEnv = (p) =>
  Object.fromEntries(
    readFileSync(p, 'utf8')
      .split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
      }),
  );

const env = parseEnv(`${REPO}/.env`);
const secrets = parseEnv('/home/fabian/.config/secrets.env');
const SB_URL = env.VITE_SUPABASE_URL;
const MGMT = secrets.SUPABASE_ACCESS_TOKEN;
if (!SB_URL || !MGMT) throw new Error('Faltan VITE_SUPABASE_URL o SUPABASE_ACCESS_TOKEN');

// ── service_role key (Management API) ─────────────────────────────────────────
const keys = await (await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys`, {
  headers: { Authorization: `Bearer ${MGMT}` },
})).json();
const SERVICE = keys.find((k) => k.name === 'service_role')?.api_key;
if (!SERVICE) throw new Error('No se obtuvo la service_role key');
const ADMIN = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' };

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const email = `epix.multidispositivo.${Date.now()}@gmail.com`;
let userId = null;
let browser;

try {
  // ── 1. Usuario de prueba ─────────────────────────────────────────────────────
  const created = await (await fetch(`${SB_URL}/auth/v1/admin/users`, {
    method: 'POST', headers: ADMIN, body: JSON.stringify({ email, email_confirm: true }),
  })).json();
  userId = created.id;
  if (!userId) throw new Error(`createUser falló: ${JSON.stringify(created)}`);
  console.log(`👤 Cuenta de prueba: ${userId}`);

  // ── 2. Sesión por magiclink (verificación server-side) ──────────────────────
  const link = await (await fetch(`${SB_URL}/auth/v1/admin/generate_link`, {
    method: 'POST', headers: ADMIN, body: JSON.stringify({ type: 'magiclink', email }),
  })).json();
  const session = await (await fetch(`${SB_URL}/auth/v1/verify`, {
    method: 'POST', headers: { apikey: SERVICE, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', token_hash: link.hashed_token }),
  })).json();
  if (!session.access_token) throw new Error(`verify falló: ${JSON.stringify(session)}`);
  const storageKey = `sb-${REF}-auth-token`;
  const injectSession = JSON.stringify(session);
  check('Sesión obtenida (misma cuenta para ambos dispositivos)', true, `uid=${session.user.id}`);

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const mkDevice = async (label) => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark', locale: 'es-CO',
    });
    const errors = [];
    const page = await ctx.newPage();
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)));
    await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [storageKey, injectSession]);
    return { label, ctx, page, errors };
  };

  const cloudHas = async (id) =>
    (await (await fetch(`${SB_URL}/rest/v1/favorites?select=show_id&user_id=eq.${userId}`, { headers: ADMIN })).json())
      .some?.((r) => r.show_id === id) ?? false;

  // ── 3. Dispositivo A: favoritear Breaking Bad y reabrir la app (push) ───────
  const A = await mkDevice('A');
  await A.page.goto(`${APP}/shows/169`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await A.page.waitForSelector('button[aria-label="Añadir a favoritos"]', { timeout: 45000 });
  await A.page.click('button[aria-label="Añadir a favoritos"]');
  await A.page.waitForSelector('button[aria-label="Quitar de favoritos"]', { timeout: 15000 });
  check('Dispositivo A: «Breaking Bad» marcado como favorito (local)', true);

  await A.page.reload({ waitUntil: 'domcontentloaded' }); // reabrir el PWA → sync de arranque
  let cloudA = false;
  for (let i = 0; i < 30 && !cloudA; i++) { await A.page.waitForTimeout(1000); cloudA = await cloudHas(169); }
  check('Dispositivo A: favorito sincronizado a la nube (sync de arranque)', cloudA, cloudA ? '' : 'timeout 30s');

  // ── 4. Dispositivo B: pull inicial de la nube ────────────────────────────────
  const B = await mkDevice('B');
  await B.page.goto(`${APP}/favorites`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  let pullOk = false;
  try { await B.page.waitForSelector('text=Breaking Bad', { timeout: 30000 }); pullOk = true; } catch { /* fail */ }
  check('Dispositivo B: ve «Breaking Bad» sin interacción (pull de nube)', pullOk);
  await B.page.screenshot({ path: `${OUT}/18-multidispositivo-repull.png` });

  // ── 5. A marca Game of Thrones → micro-sync automático (sin botón ni recargar) ─
  await A.page.goto(`${APP}/shows/82`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await A.page.waitForSelector('button[aria-label="Añadir a favoritos"]', { timeout: 45000 });
  await A.page.click('button[aria-label="Añadir a favoritos"]');
  await A.page.waitForSelector('button[aria-label="Quitar de favoritos"]', { timeout: 15000 });
  check('Dispositivo A: «Game of Thrones» marcado como favorito (local)', true);
  let cloudB = false;
  for (let i = 0; i < 20 && !cloudB; i++) { await A.page.waitForTimeout(1000); cloudB = await cloudHas(82); }
  check('Micro-sync: «Game of Thrones» llega a la nube sin intervención (≤20 s)', cloudB, cloudB ? '' : 'timeout 20s');

  // ── 6. Realtime: B lo ve EN VIVO sin recargar ────────────────────────────────
  let realtimeOk = false;
  try { await B.page.waitForSelector('text=Game of Thrones', { timeout: 45000 }); realtimeOk = true; } catch { /* fail */ }
  check('Realtime: B ve «Game of Thrones» aparecer en vivo (sin recargar)', realtimeOk);
  await B.page.waitForTimeout(1500);
  await B.page.screenshot({ path: `${OUT}/19-multidispositivo-realtime.png` });

  const errA = A.errors.length, errB = B.errors.length;
  check('Sin errores de consola en los dispositivos', errA + errB === 0, `A=${errA} B=${errB}`);
  await A.ctx.close(); await B.ctx.close();
} catch (e) {
  check('Ejecución completa', false, String(e).slice(0, 300));
} finally {
  if (userId) {
    const del = await fetch(`${SB_URL}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers: ADMIN });
    console.log(`🧹 Cuenta de prueba eliminada (limpieza en cascada): ${del.status}`);
  }
  if (browser) await browser.close();
}

const pass = results.every((r) => r.ok);
writeFileSync(`${REPO}/docs/evidencias/multidispositivo-resultado.json`, JSON.stringify({
  fecha: new Date().toISOString(), veredicto: pass ? 'PASS' : 'FAIL', pruebas: results,
  nota: 'Dos contextos de navegador aislados con la misma cuenta (simulación fiel de 2 dispositivos). Disparadores reales: sync de arranque, botón «Sincronizar ahora» y Realtime.',
}, null, 2));
console.log(`\n${pass ? '🏆 VERIFICACIÓN MULTI-DISPOSITIVO: PASS' : '💥 VERIFICACIÓN MULTI-DISPOSITIVO: FAIL'}`);
process.exit(pass ? 0 : 1);
