/**
 * Elimina cualquier source map que quede en `dist/` después del build.
 *
 * El plugin de Sentry sube los mapas y borra los suyos, pero el del service
 * worker (`sw.js.map`) se emite al final del proceso; este limpiador corre tras
 * `vite build` y garantiza que producción NUNCA sirva `.map`.
 */
import { globSync, rmSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
const maps = globSync('**/*.map', { cwd: dist });

for (const map of maps) {
  rmSync(new URL(map, dist));
}

if (maps.length > 0) {
  console.log(`clean-sourcemaps: ${maps.length} source map(s) eliminado(s) de dist/`);
}
