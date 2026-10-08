#!/usr/bin/env node
/**
 * Sincronizador repo → Obsidian.
 *
 * Mantiene el espejo de conocimiento del vault Ningendo Bee al día SIN pisar el
 * contenido curado:
 *   1. Actualiza `actualizado:` (frontmatter) de las notas clave a la fecha del
 *      último commit del repositorio.
 *   2. Regenera el bloque gestionado `<!-- epix-facts begin/end -->` de
 *      `Epix/Estado del Proyecto.md` con los hechos canónicos del manifiesto.
 *
 * El resto de la knowledge base es curada a mano (los entornos NO son espejos).
 * Uso: node tools/alignment-check/sync-obsidian.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const M = JSON.parse(readFileSync(join(HERE, 'manifest.json'), 'utf8'));
const H = M.hechos;

function fechaUltimoCommit() {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

const VAULT = M.obsidian.vault.replace(/^~/, homedir());
if (!existsSync(VAULT)) {
  console.log(`⏭️  Vault no disponible en ${VAULT} — nada que sincronizar.`);
  process.exit(0);
}

const fecha = fechaUltimoCommit();
let cambios = 0;

// ── 1) Fechas del frontmatter en las notas clave ──
for (const nota of M.obsidian.notasClave) {
  const ruta = join(VAULT, nota);
  if (!existsSync(ruta)) {
    console.log(`⚠️  Falta la nota «${nota}» (el verificador lo reportará).`);
    continue;
  }
  const antes = readFileSync(ruta, 'utf8');
  const despues = antes.replace(/^actualizado: \d{4}-\d{2}-\d{2}$/m, `actualizado: ${fecha}`);
  if (despues !== antes) {
    writeFileSync(ruta, despues);
    cambios += 1;
    console.log(`📅 ${nota} → actualizado: ${fecha}`);
  }
}

// ── 2) Bloque gestionado de hechos canónicos ──
const bloques = {
  'Epix/Estado del Proyecto.md': [
    '<!-- epix-facts:begin -->',
    `> [!info] Hechos canónicos — sincronizados automáticamente por \`tools/alignment-check\` (no editar a mano)`,
    `> **Versión:** v${H.version} · **App:** ${H.app} · **Pruebas:** ${H.pruebasUnitarias} unit + ${H.pruebasE2E} E2E (cobertura ${H.cobertura}) · **Bundle:** ${H.bundleEntradaGzipKB} KB gzip (entrada) · **Lighthouse:** ${H.lighthouse}`,
    `> **Deploy:** ${H.deployModelo} (**${H.deployEstado}** desde ${H.deployFechaCongelamiento}) · **Releases:** v1.0.0 · ${H.releaseDestacada} · **Sincronizado:** ${fecha}`,
    '<!-- epix-facts:end -->',
  ].join('\n'),
};

for (const [nota, bloque] of Object.entries(bloques)) {
  const ruta = join(VAULT, nota);
  if (!existsSync(ruta)) {
    console.log(`⚠️  Falta la nota «${nota}» — no se puede regenerar el bloque.`);
    continue;
  }
  const contenido = readFileSync(ruta, 'utf8');
  const patron = /<!-- epix-facts:begin -->[\s\S]*?<!-- epix-facts:end -->/;
  if (!patron.test(contenido)) {
    console.log(`⚠️  «${nota}» no tiene marcadores epix-facts:begin/end — añádelos una vez y reintenta.`);
    continue;
  }
  const nuevo = contenido.replace(patron, bloque);
  if (nuevo !== contenido) {
    writeFileSync(ruta, nuevo);
    cambios += 1;
    console.log(`🧱 ${nota} → bloque de hechos regenerado.`);
  }
}

console.log(cambios === 0 ? '✅ Obsidian ya estaba al día.' : `✅ Obsidian sincronizado (${cambios} cambio(s)).`);
