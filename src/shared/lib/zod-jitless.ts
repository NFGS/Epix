import { z } from 'zod';

/**
 * CSP estricto (sin `'unsafe-eval'`): desactiva la JIT de Zod y su sonda de
 * capacidades con `new Function`, que Chrome reporta como violación de CSP
 * (`securitypolicyviolation`) en el panel de Issues aunque el error se capture.
 *
 * Referencia: Zod 4 (`node_modules/zod/v4/core/util.js` — «Skip the probe under
 * jitless: strict CSPs report the caught `new Function` as a violation»).
 * Este módulo debe importarse ANTES de crear/parsear cualquier esquema.
 */
z.config({ jitless: true });
