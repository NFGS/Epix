#!/usr/bin/env bash
# Instala el hook pre-push de alineación (una vez por clon).
# Bloquea el push si los entornos (local · GitHub) están desalineados.
set -euo pipefail

RAIZ="$(git rev-parse --show-toplevel)"
cd "$RAIZ"

mkdir -p .git/hooks
cat > .git/hooks/pre-push <<'HOOK'
#!/usr/bin/env bash
# Verifica la alineación de los 4 entornos antes de empujar (modo CI: local + GitHub).
if ! node tools/alignment-check/check-alignment.mjs --ci; then
  echo ""
  echo "❌ Push bloqueado: los entornos no están alineados (lee las pistas de arriba)."
  echo "   Flujo: corrige cada pista → 'pnpm align:check' (todo) → reintenta el push."
  echo "   Para saltarlo excepcionalmente: git push --no-verify"
  exit 1
fi
HOOK

chmod +x .git/hooks/pre-push
echo "✅ Hook pre-push instalado en .git/hooks/pre-push"
echo "   Se ejecuta: node tools/alignment-check/check-alignment.mjs --ci"
