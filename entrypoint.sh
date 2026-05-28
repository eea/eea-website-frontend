#!/usr/bin/env bash
set -Ex

function apply_rebuild {
  mkdir -p /app/src/addons
  gosu node yarn develop
  gosu node yarn
  gosu node yarn build
}

# Should we re-build
test -n "$REBUILD" && apply_rebuild

# Upload source maps to Sentry (only when SENTRY_* env vars are set)
gosu node ./node_modules/@plone-collective/volto-sentry/scripts/create-sentry-release.sh

if [[ "$1" == "yarn"* ]]; then
  echo "Starting Volto"
  exec gosu node "$@"
fi

exec "$@"
