# EEA website frontend

Frontend for the main EEA website, built with Volto 19.

## Requirements

- Node.js 22 or 24
- pnpm 10.20.0, activated through Corepack
- Git
- Docker, when running the backend or production image locally

```bash
nvm use
corepack enable
corepack prepare pnpm@10.20.0 --activate
```

## Workspace layout

- `core/` contains the Volto `19.3.0` checkout.
- `packages/eea-website-frontend/` is the project policy add-on.
- `packages/volto-eea-website-theme/` and
  `packages/volto-eea-design-system/` are the only add-on development checkouts;
  both are fetched from their `volto19` branches by `mrs-developer`.
- `volto.config.js` is the authoritative add-on and theme configuration.

Only the policy add-on is tracked by this repository. The theme and design
system workspaces are development checkouts and are ignored by Git.

## Install and start

Fetch Volto, the theme, and the design system, install the locked dependencies,
and build the core packages:

```bash
make develop
```

For an already prepared workspace:

```bash
make install
```

Start the development server at <http://localhost:3000>:

```bash
make start
```

Useful backend variants are available through `make relstorage`, `make staging`,
and `make demo`.

## Checks

```bash
make lint
make typecheck
make test
make ci-i18n
make build
make bundlewatch
```

`make check` runs the static checks and unit tests together. CI uses
`make ci-install` so the committed `pnpm-lock.yaml` cannot be changed during an
installation.

## Cypress

The default Cypress command is a local smoke test. Start a backend and the
frontend in separate terminals, then run the test:

```bash
make acceptance-backend-start
RAZZLE_API_PATH=http://localhost:55001/plone make start
make cypress-local
```

The content-dependent regression suite remains separate:

```bash
make cypress-staging
make cypress-production
```

## Docker

Build the Volto 19 image:

```bash
make docker-build
```

Run the frontend and EEA backend together:

```bash
docker compose up --build
```

The image is based on the Plone frontend builder and production images pinned to
Volto `19.3.0`.

## Working with add-on checkouts

```bash
make status
make pull
make husky
```

These commands operate on `core/` and Git repositories immediately below
`packages/`. They never switch an add-on to another branch automatically.
