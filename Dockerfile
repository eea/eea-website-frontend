# syntax=docker/dockerfile:1
ARG VOLTO_VERSION=19.6.1
FROM plone/frontend-builder:${VOLTO_VERSION} AS builder
ARG MAX_OLD_SPACE_SIZE=7168

COPY --chown=node packages/eea-website-frontend /app/packages/eea-website-frontend
COPY --chown=node volto.config.js /app/
COPY --chown=node package.json /app/
COPY --chown=node mrs.developer.json /app/
COPY --chown=node pnpm-workspace.yaml /app/
COPY --chown=node pnpm-lock.yaml /app/
COPY --chown=node .npmrc .pnpmfile.cjs /app/
COPY --chown=node scripts/fetch-core.cjs /app/scripts/fetch-core.cjs
COPY --chown=node entrypoint.sh /app/entrypoint.sh

RUN --mount=type=cache,id=pnpm,target=/app/.pnpm-store,uid=1000 <<EOT
    set -e
    export CI=1
    export NODE_OPTIONS=--max-old-space-size=${MAX_OLD_SPACE_SIZE}
    pnpm develop:core
    pnpm install --frozen-lockfile
    pnpm build:deps
    pnpm build
    pnpm install --prod --frozen-lockfile --ignore-scripts
    pnpm rebuild @sentry/cli
    node packages/eea-website-frontend/scripts/check-server-dependencies.cjs
    test -x node_modules/.bin/sentry-cli
EOT

FROM plone/frontend-prod-config:${VOLTO_VERSION}

LABEL maintainer="European Environment Agency <webadmin@eea.europa.eu>" \
      org.label-schema.name="eea-website-frontend" \
      org.label-schema.description="EEA Main Website Volto frontend image." \
      org.label-schema.vendor="European Environment Agency"

COPY --from=builder /app/ /app/

USER root

# Shared corepack cache owned by the runtime "node" user, so pnpm is not
# downloaded from registry.npmjs.org on every container start.
ENV COREPACK_HOME=/opt/corepack

# ca-certificates: the slim base image has no system CA bundle, which sentry-cli
# needs to upload source maps over HTTPS.
RUN <<EOT
    set -e
    apt-get update
    apt-get install -y --no-install-recommends ca-certificates
    rm -rf /var/lib/apt/lists/*
    CI=1 npm i -g corepack@latest
    corepack enable pnpm
    corepack prepare pnpm@10.20.0 --activate
    chown -R node:node /opt/corepack
    chmod +x /app/entrypoint.sh
EOT

USER node

EXPOSE 3000 3001

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["pnpm", "start:prod"]
