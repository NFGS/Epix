#!/usr/bin/env node
/**
 * Verificador de alineación de los 4 entornos de Epix.
 *
 * Compara los hechos canónicos del `manifest.json` contra los cuatro entornos
 * (directorio · GitHub · Notion · Obsidian) y reporta cada desajuste con una
 * **pista** de qué archivo/página actualizar. Los entornos NO son espejos:
 * cada uno valida solo lo que le corresponde por rol.
 *
 * Uso:
 *   node tools/alignment-check/check-alignment.mjs --all    # todo lo disponible en local
 *   node tools/alignment-check/check-alignment.mjs --ci     # CI: solo local + GitHub
 *   node tools/alignment-check/check-alignment.mjs --json   # salida máquina
 *
 * Códigos: 0 = alineado · 1 = hay desajustes (❌) · los ⏭️ (omitidos) no fallan.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = new Set(process.argv.slice(2));
const MODO_CI = args.has('--ci');
const SOLO_JSON = args.has('--json');

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const M = JSON.parse(readFileSync(join(HERE, 'manifest.json'), 'utf8'));
const H = M.hechos;

const resultados = [];
const check = (entorno, nombre, ok, detalle = '', hint = '') =>
  resultados.push({ entorno, nombre, ok, detalle, hint });

// ─────────────────────────── 1) Directorio ───────────────────────────
function leer(rel) {
  try {
    return readFileSync(join(ROOT, rel), 'utf8');
  } catch {
    return null;
  }
}

function contiene(entorno, rel, aguja, hint) {
  const texto = leer(rel);
  if (texto === null) {
    check(entorno, `${rel} existe`, false, 'archivo no encontrado', hint);
    return;
  }
  const ok = texto.includes(aguja);
  check(entorno, `${rel} contiene «${aguja}»`, ok, ok ? '' : 'no encontrado', ok ? '' : hint);
}

function revisarDirectorio() {
  contiene('directorio', 'README.md', H.app, 'Añade la URL de la app en README § Producción');
  contiene('directorio', 'README.md', 'integración nativa', 'Documenta el deploy nativo en README § Producción');
  contiene('directorio', 'AGENTS.md', String(H.pruebasUnitarias), 'Actualiza el conteo de pruebas en AGENTS.md (estado)');
  contiene('directorio', 'AGENTS.md', 'congelados', 'Marca el congelamiento de infraestructura en AGENTS.md');
  contiene('directorio', 'SPEC.md', `v${H.version}`, 'Actualiza la versión en SPEC.md (estado del roadmap)');
  contiene('directorio', 'CHANGELOG.md', `[${H.version}]`, 'Añade el corte de versión en CHANGELOG.md');
  contiene('directorio', 'docs/entrega/correo-docente.md', H.app, 'Incluye la URL en el correo al docente');
  contiene('directorio', 'docs/entrega/correo-docente.md', String(H.pruebasUnitarias), 'Actualiza el conteo de pruebas en el correo');

  const pkg = leer('package.json');
  if (pkg === null) {
    check('directorio', 'package.json existe', false, '', 'Restaura package.json');
  } else {
    const version = JSON.parse(pkg).version;
    const ok = version === H.version;
    check('directorio', `package.json version = ${H.version}`, ok, ok ? '' : version, 'Sube/baja la versión en package.json');
  }
}

// ─────────────────────────── 2) GitHub ───────────────────────────
async function gh(path) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) {
    try {
      const r = await fetch(`https://api.github.com${path}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'epix-alignment-check',
        },
      });
      if (!r.ok) return { error: `HTTP ${r.status}` };
      return { data: await r.json() };
    } catch (e) {
      return { error: e.message };
    }
  }
  try {
    const out = execFileSync('gh', ['api', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { data: JSON.parse(out) };
  } catch {
    return { error: 'sin GH_TOKEN y sin gh CLI disponible' };
  }
}

async function revisarGithub() {
  const repo = await gh(`/repos/${M.github.repo}`);
  if (repo.error) {
    check('github', 'API de GitHub accesible', null, repo.error, 'Verificación omitida (sin red/token)');
    return;
  }
  const r = repo.data;
  check('github', `About: website = ${M.github.homepage}`, r.homepage === M.github.homepage, r.homepage ?? '(vacío)', 'GitHub → repo → About (engranaje) → Website');
  check('github', 'About: descripción presente', Boolean(r.description && r.description.length > 10), r.description ?? '(vacía)', 'GitHub → About → Description');

  const topics = r.topics ?? [];
  const faltan = M.github.topicsMinimos.filter((t) => !topics.includes(t));
  check(
    'github',
    `topics incluyen [${M.github.topicsMinimos.join(', ')}]`,
    faltan.length === 0,
    faltan.length ? `faltan: ${faltan.join(', ')}` : '',
    `gh repo edit ${M.github.repo} ${faltan.map((t) => `--add-topic ${t}`).join(' ')}`,
  );

  const rel = await gh(`/repos/${M.github.repo}/releases/latest`);
  if (!rel.error) {
    const tag = rel.data.tag_name;
    const ok = tag === H.releaseDestacada;
    check('github', `release más reciente = ${H.releaseDestacada}`, ok, ok ? '' : tag, 'Publica la release o actualiza el manifiesto');
  }
}

// ─────────────────────────── 3) Obsidian ───────────────────────────
function revisarObsidian() {
  const vault = M.obsidian.vault.replace(/^~/, homedir());
  if (!existsSync(vault)) {
    check('obsidian', 'vault disponible', null, vault, 'Solo local: se omite cuando no está montado');
    return;
  }

  for (const nota of M.obsidian.notasClave) {
    const existe = existsSync(join(vault, nota));
    check('obsidian', `existe «${nota}»`, existe, '', existe ? '' : 'Ejecuta `pnpm align:sync` o revisa el vault');
  }

  const leerVault = (rel) => {
    try {
      return readFileSync(join(vault, rel), 'utf8');
    } catch {
      return null;
    }
  };

  const readme = leerVault('Epix/README.md');
  if (readme !== null) {
    check('obsidian', 'Epix/README contiene la URL de la app', readme.includes(H.app), '', '`pnpm align:sync` no lo escribe: edítalo a mano o revisa');
    check('obsidian', `Epix/README contiene ${H.pruebasUnitarias} (pruebas)`, readme.includes(String(H.pruebasUnitarias)), '', 'Actualiza la tabla de identidad del README del vault');
  }
  const estado = leerVault('Epix/Estado del Proyecto.md');
  if (estado !== null) {
    check('obsidian', 'Epix/Estado menciona el congelamiento', /congelad/i.test(estado), '', 'Añade la nota de infraestructura congelada');
    check('obsidian', 'Epix/Estado tiene el bloque «epix-facts»', estado.includes('<!-- epix-facts:begin -->'), '', 'Ejecuta `pnpm align:sync` para (re)generar el bloque');
  }
  const checklist = leerVault('Epix/Checklist de entrega y sustentación.md');
  if (checklist !== null) {
    check('obsidian', 'Checklist lista los pendientes del owner', checklist.includes('Android') && /correo/i.test(checklist), '', 'Actualiza la checklist del vault');
  }

  try {
    const notas = readdirSync(join(vault, M.obsidian.carpeta), { recursive: true }).filter((f) => String(f).endsWith('.md')).length;
    check('obsidian', 'KB con ≥ 16 notas', notas >= 16, `${notas} notas`, 'Recrea/verifica la carpeta Epix del vault');
  } catch {
    check('obsidian', 'carpeta Epix navegable', false, '', 'Revisa el vault');
  }
}

// ─────────────────────────── 4) Notion ───────────────────────────
function tokenNotion() {
  if (process.env.NOTION_EPIX_TOKEN) return process.env.NOTION_EPIX_TOKEN;
  try {
    const env = readFileSync(join(homedir(), '.config/secrets.env'), 'utf8');
    const linea = env.split('\n').find((l) => l.startsWith('NOTION_EPIX_TOKEN='));
    return linea ? linea.slice('NOTION_EPIX_TOKEN='.length).trim() : null;
  } catch {
    return null;
  }
}

async function textoPagina(id) {
  const r = await fetch(`https://api.notion.com/v1/blocks/${id}/children?page_size=100`, {
    headers: { Authorization: `Bearer ${tokenNotion()}`, 'Notion-Version': '2022-06-28' },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  return (j.results ?? [])
    .map((b) => (b[b.type]?.rich_text ?? []).map((t) => t.plain_text ?? '').join(''))
    .join('\n');
}

async function revisarNotion() {
  if (!tokenNotion()) {
    check('notion', 'token disponible', null, 'NOTION_EPIX_TOKEN no encontrado', 'Solo local: agrega el token o usa la MCP');
    return;
  }
  try {
    const indice = await textoPagina(M.notion.paginaIndex);
    // En Notion el enlace se muestra como dominio (sin https://): comparar por host.
    const host = new URL(H.app).host;
    check('notion', 'Índice: URL de la app', indice.includes(host), '', 'Actualiza el encabezado del índice en Notion');
    check('notion', `Índice: versión v${H.version}`, indice.includes(`v${H.version}`), '', 'Actualiza «Estado del proyecto» del índice');
    check('notion', 'Índice: deploy congelado', /congelad/i.test(indice), '', 'Añade la nota de congelamiento al índice');

    const estado = await textoPagina(M.notion.paginaEstado);
    check('notion', `§8: conteo de pruebas (${H.pruebasUnitarias})`, estado.includes(String(H.pruebasUnitarias)), '', '`pnpm align:sync` lo actualiza (bloque gestionado)');
    check('notion', `§8: bundle ${H.bundleEntradaGzipKB} KB`, estado.includes(`${H.bundleEntradaGzipKB} KB`), '', '`pnpm align:sync` lo actualiza (bloque gestionado)');
  } catch (e) {
    check('notion', 'API de Notion accesible', null, e.message, 'Verificación omitida');
  }
}

// ─────────────────────────── Salida ───────────────────────────
revisarDirectorio();
await revisarGithub();
if (MODO_CI) {
  check('obsidian', 'verificación', null, 'omitida en CI (el vault no vive en el runner)', 'Ejecuta `pnpm align:check` en local');
  check('notion', 'verificación', null, 'omitida en CI (token no disponible en el runner)', 'Ejecuta `pnpm align:check` en local');
} else {
  revisarObsidian();
  await revisarNotion();
}

const icono = (r) => (r.ok === true ? '✅' : r.ok === false ? '❌' : '⏭️');
const fallos = resultados.filter((r) => r.ok === false);
const omitidos = resultados.filter((r) => r.ok === null);

if (SOLO_JSON) {
  console.log(JSON.stringify({ proyecto: M.proyecto, resultados, fallos: fallos.length, omitidos: omitidos.length }, null, 2));
} else {
  console.log(`\n🧭 Alineación de los 4 entornos — ${M.proyecto}${MODO_CI ? ' (modo CI)' : ''}\n`);
  let entornoActual = '';
  for (const r of resultados) {
    if (r.entorno !== entornoActual) {
      entornoActual = r.entorno;
      console.log(`── ${entornoActual.toUpperCase()} ──`);
    }
    console.log(`  ${icono(r)} ${r.nombre}${r.detalle ? ` — ${r.detalle}` : ''}`);
    if (r.ok === false && r.hint) console.log(`     ↳ ${r.hint}`);
  }
  console.log('');
  if (fallos.length === 0) {
    console.log(`🎉 Los entornos están alineados (${resultados.length - omitidos.length} verificaciones, ${omitidos.length} omitidas).`);
  } else {
    console.log(`❌ ${fallos.length} desajuste(s) — corrige cada pista y re-ejecuta.`);
  }
}

process.exit(fallos.length === 0 ? 0 : 1);
