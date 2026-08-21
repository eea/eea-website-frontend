#!/usr/bin/env bash
set -euo pipefail

for repo in core packages/*; do
  if [[ -d "$repo/.git" && -d "$repo/.husky" ]]; then
    printf '%s - ' "$repo"
    pnpm --dir "$repo" exec husky install
  fi
done
