#!/usr/bin/env bash
set -euo pipefail

for repo in core packages/*; do
  [[ -d "$repo/.git" ]] || continue
  status="$(git -C "$repo" status --short)"
  echo "============= $repo ============="
  if [[ -z "$status" ]]; then
    git -C "$repo" pull --ff-only
  else
    echo "Skipped because the worktree is not clean:"
    echo "$status"
  fi
done
