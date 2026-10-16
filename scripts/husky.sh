#!/usr/bin/env bash
set -euo pipefail

# husky is pinned (v9) as a devDependency of the project root, but `core` is a
# nested workspace root (own pnpm-workspace.yaml), so `pnpm --dir <repo> exec`
# cannot resolve it. Run the root binary with cwd set to each repo instead.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HUSKY="$ROOT/node_modules/husky/bin.js"

for repo in core packages/*; do
  if [[ -d "$repo/.git" && -d "$repo/.husky" ]]; then
    printf '%s - ' "$repo"
    (cd "$repo" && node "$HUSKY")
  fi
done
