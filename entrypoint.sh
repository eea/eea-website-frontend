#!/usr/bin/env bash
set -Eeuo pipefail

function run_as_node {
  if [[ "$(id -u)" == "0" ]] && command -v gosu >/dev/null 2>&1; then
    gosu node "$@"
  else
    "$@"
  fi
}

# Upload source maps only when the Sentry integration is fully configured.
SENTRY_SCRIPT="/app/node_modules/@plone-collective/volto-sentry/scripts/create-sentry-release.sh"
if [[ -x "$SENTRY_SCRIPT" && -n "${SENTRY_AUTH_TOKEN:-}" && -n "${SENTRY_ORG:-}" && -n "${SENTRY_PROJECT:-}" ]]; then
  run_as_node "$SENTRY_SCRIPT"
fi

if [[ "${1:-}" == "pnpm" ]]; then
  echo "Starting Volto"
  if [[ "$(id -u)" == "0" ]] && command -v gosu >/dev/null 2>&1; then
    exec gosu node "$@"
  fi
fi

exec "$@"
