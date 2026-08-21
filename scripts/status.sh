#!/usr/bin/env bash
set -euo pipefail

for repo in core packages/*; do
  [[ -d "$repo/.git" ]] || continue
  status="$(git -C "$repo" status --short)"
  if [[ -n "$status" ]]; then
    echo "============= $repo ============="
    echo "$status"
  fi
done
