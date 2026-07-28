#!/usr/bin/env bash
set -euo pipefail
PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="${1:-.}"
cp -R "$PACKAGE_DIR/src/." "$REPO_DIR/src/"
cp -R "$PACKAGE_DIR/e2e/." "$REPO_DIR/e2e/"
echo "Référentiel copié dans $REPO_DIR"
echo "Lancer ensuite : pnpm run typecheck && pnpm run test && pnpm run build && pnpm run test:e2e"
