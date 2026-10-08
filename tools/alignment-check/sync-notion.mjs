#!/usr/bin/env node
/**
 * Sincronizador repo → Notion (bloques gestionados).
 *
 * Solo actualiza los bloques DECLARADOS como gestionados, comparando antes de
 * escribir (idempotente):
 *   · Índice  → «📌 Estado del proyecto: …vX.Y.Z…»
 *   · §8      → bullet de métricas (pruebas/cobertura) y bullet de bundle.
 * El resto de Notion es curado a mano (los entornos NO son espejos).
 *
 * Token: `NOTION_EPIX_TOKEN` (env o ~/.config/secrets.env). Sin token → omite.
 * Uso: node tools/alignment-check/sync-notion.mjs [--dry-run]
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DRY = process.argv.includes('--dry-run');
const HERE = dirname(fileURLToPath(import.meta.url));
const M = JSON.parse(readFileSync(join(HERE, 'manifest.json'), 'utf8'));
const H = M.hechos;

function token() {
  if (process.env.NOTION_EPIX_TOKEN) return process.env.NOTION_EPIX_TOKEN;
  try {
    const env = readFileSync(join(homedir(), '.config/secrets.env'), 'utf8');
    const l = env.split('\n').find((x) => x.startsWith('NOTION_EPIX_TOKEN='));
    return l ? l.slice('NOTION_EPIX_TOKEN='.length).trim() : null;
  } catch {
    return null;
  }
}

const TOKEN = token();
if (!TOKEN) {
  console.log('⏭️  Sin NOTION_EPIX_TOKEN — sincronización de Notion omitida (solo local).');
  process.exit(0);
}

const HDR = { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' };
const api = async (ruta, opciones = {}) => {
  const r = await fetch(`https://api.notion.com/v1${ruta}`, { headers: HDR, ...opciones });
  if (!r.ok) throw new Error(`${ruta} → HTTP ${r.status}`);
  return r.json();
};

const plano = (block) => (block[block.type]?.rich_text ?? []).map((t) => t.plain_text ?? '').join('');
const seg = (texto, bold = false) => ({ type: 'text', text: { content: texto }, annotations: { bold } });

// ── Bloques gestionados (prefijo detectable → rich_text esperado) ──
const gestionMetricas = [
  seg(`${H.pruebasUnitarias} pruebas unitarias + ${H.pruebasE2E} E2E`, true),
  seg(' (Playwright con API mockeada) en verde · cobertura domain/application '),
  seg(H.cobertura, true),
  seg(' (umbral 70 %) · gates `lint + typecheck + test + coverage + build + size + test:e2e` OK.'),
];
const gestionBundle = [
  seg('Bundle inicial ≈ '),
  seg(`${H.bundleEntradaGzipKB} KB gzip`, true),
  seg(' de entrada (~176 KB eager total; presupuesto: 250 KB) + chunk Supabase 54 KB '),
  seg('solo si se configura la nube', true),
  seg('.'),
];
const gestionEstado = [
  seg('📌 '),
  seg('Estado del proyecto:', true),
  seg(' completo y en producción ('),
  seg(`v${H.version}`, true),
  seg(') — incrementos 1–7, sprints 5.0–5.3 y extras (cuentas reales, push, multi-dispositivo, Sentry). Detalle y evidencias en la página '),
  seg('8. Estado de avance y evidencias', true),
  seg('.'),
];

const textoDe = (segmentos) => segmentos.map((s) => s.text.content).join('');

async function sincronizarPagina(nombre, pageId, detectores) {
  const { results } = await api(`/blocks/${pageId}/children?page_size=100`);
  let cambios = 0;
  for (const block of results) {
    const actual = plano(block);
    for (const { probar, esperado, etiqueta } of detectores) {
      if (!probar(actual)) continue;
      if (actual === textoDe(esperado)) {
        console.log(`= ${nombre} · ${etiqueta}: ya al día.`);
        continue;
      }
      if (DRY) {
        console.log(`· [dry-run] ${nombre} · ${etiqueta} cambiaría a: «${textoDe(esperado).slice(0, 90)}…»`);
        continue;
      }
      const clave = block.type; // bulleted_list_item | paragraph
      await api(`/blocks/${block.id}`, { method: 'PATCH', body: JSON.stringify({ [clave]: { rich_text: esperado } }) });
      console.log(`✍️  ${nombre} · ${etiqueta}: actualizado.`);
      cambios += 1;
    }
  }
  return cambios;
}

let total = 0;
total += await sincronizarPagina('Índice', M.notion.paginaIndex, [
  { probar: (t) => t.includes('Estado del proyecto:') && t.includes('producción'), esperado: gestionEstado, etiqueta: 'estado del proyecto' },
]);
total += await sincronizarPagina('§8', M.notion.paginaEstado, [
  { probar: (t) => /pruebas unitarias \+/.test(t) && /E2E/.test(t), esperado: gestionMetricas, etiqueta: 'métricas de pruebas' },
  { probar: (t) => t.includes('Bundle inicial'), esperado: gestionBundle, etiqueta: 'bundle inicial' },
]);

console.log(total === 0 ? '✅ Notion ya estaba al día.' : `✅ Notion sincronizado (${total} bloque(s)).`);
