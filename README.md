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

- `core/` contains the Volto checkout (the `core` tag in `mrs.developer.json`).
- `packages/eea-website-frontend/` is the project policy add-on.
- `packages/<add-on>/` are the add-on development checkouts, fetched by
  `mrs-developer` from the branches listed in `mrs.developer.json`.
- `volto.config.js` is the authoritative add-on and theme configuration.

Only the policy add-on is tracked by this repository. The add-on workspaces are
development checkouts and are ignored by Git.

## Add-on versions

As on `master`, `package.json` pins the released add-on versions in
`dependencies` and `pnpm.overrides`. The production image and CI install only
these releases (`pnpm develop:core` fetches just Volto core).

Add-ons without a Volto 19 release yet are installed from their `volto19`
branch; `dependencies-comments` lists them. Set their released version once
they are merged and released.

`make develop` checks out every add-on, temporarily switches them to
`workspace:*` (`scripts/apply-workspace-protocol.cjs`), installs, and restores
the pinned `package.json` and `pnpm-lock.yaml`
(`scripts/restore-production-package.cjs`).

## Install and start

Fetch Volto and the add-ons, link the add-on checkouts, and build the core
packages:

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
Volto `19.6.1`.

## Working with add-on checkouts

```bash
make status
make pull
make husky
```

These commands operate on `core/` and Git repositories immediately below
`packages/`. They never switch an add-on to another branch automatically.
