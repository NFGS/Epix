# 🧭 alignment-check — Sincronización de los 4 entornos de Epix

> **Mecanismo de alineación** entre el **directorio del proyecto**, el **repo de GitHub**,
> la **documentación de Notion** y la **knowledge base de Obsidian**. Los cuatro entornos
> se mantienen **alineados con los mismos hechos canónicos**, pero **no son espejos**: cada
> uno conserva su rol y su contenido propio.

## Matriz de roles (por qué NO son espejos)

| Entorno | Rol | Qué vive SOLO aquí | Qué comparte |
|---|---|---|---|
| 💻 Directorio | Operación y verdad técnica | Código, SPEC, requisitos, ADRs, CHANGELOG | URL, versión, métricas, deploy |
| 🐙 GitHub | Cara técnica pública | Repo, releases, CI, About/topics | URL, versión, release destacada |
| 📓 Notion | SSOT documental SENA | Secciones 1–8, matriz, evidencias de clase | URL, versión, métricas (bloques gestionados) |
| 🧠 Obsidian | Conocimiento enlazado | KB, ADRs espejados, runbook, estudio | URL, métricas (bloque `epix-facts`) |

## El mecanismo

1. **Manifiesto de hechos canónicos** — `manifest.json` (este directorio): URL, versión,
   pruebas, cobertura, Lighthouse, conteo de ADRs, bundle, deploy, releases, páginas de
   Notion y notas del vault.
2. **Verificador** — `check-alignment.mjs`: compara los 4 entornos contra el manifiesto y
   cada ❌ trae una **pista** con el archivo/página exacto a corregir.
3. **Sincronizadores** — empujan los hechos del manifiesto hacia los entornos no-código:
   - `sync-obsidian.mjs`: fechas + bloque `<!-- epix-facts begin/end -->` (no pisa lo curado).
   - `sync-notion.mjs`: solo los **bloques gestionados** de Índice y §8 (idempotente).
4. **Hook pre-push** (opcional por clon) — `install-git-hook.sh`: bloquea el push si
   local o GitHub están desalineados.
5. **CI** — job `alignment`: verifica local + GitHub en cada push/PR.

## Comandos

```bash
pnpm align:check      # verifica los 4 entornos (local · GitHub · Notion · Obsidian)
pnpm align:ci         # verifica solo local + GitHub (como en CI)
pnpm align:sync       # sincroniza repo → Obsidian y repo → Notion (bloques gestionados)
node tools/alignment-check/check-alignment.mjs --json   # salida máquina
bash tools/alignment-check/install-git-hook.sh          # instala el hook pre-push
```

## Cómo actualizar un hecho (flujo correcto)

1. Aplica el cambio en su **entorno fuente** (código/docs → directorio; metadata → GitHub; etc.).
2. Si cambió un **hecho compartido** (URL, versión, métricas, deploy) → actualiza `manifest.json`.
3. Corre `pnpm align:check` → corrige cada ❌ siguiendo su pista.
4. Corre `pnpm align:sync` → refresca Obsidian y los bloques gestionados de Notion.
5. Haz push (el hook y el CI vuelven a verificar automáticamente).

> Los cambios originados en Notion/Obsidian se reconcilian a mano (el verificador los
> detecta al correr `--all`); nada externo se sobrescribe sin control.
