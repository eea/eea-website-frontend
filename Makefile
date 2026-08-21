##############################################################################
# Run:
#    make
#    make start
#
# Go to:
#
#     http://localhost:3000
#
# Test add-ons:
#
#    make test packages/volto-accordion-block
#
##############################################################################
# SETUP MAKE
#
## Defensive settings for make: https://tech.davis-hansson.com/p/make/
SHELL:=bash
.ONESHELL:
# for Makefile debugging purposes add -x to the .SHELLFLAGS
.SHELLFLAGS:=-eu -o pipefail -O inherit_errexit -c
.SILENT:
.DELETE_ON_ERROR:
MAKEFLAGS+=--warn-undefined-variables
MAKEFLAGS+=--no-builtin-rules

# Colors
# OK=Green, warn=yellow, error=red
ifeq ($(TERM),)
# no colors if not in terminal
	MARK_COLOR=
	OK_COLOR=
	WARN_COLOR=
	ERROR_COLOR=
	NO_COLOR=
else
	MARK_COLOR=`tput setaf 6`
	OK_COLOR=`tput setaf 2`
	WARN_COLOR=`tput setaf 3`
	ERROR_COLOR=`tput setaf 1`
	NO_COLOR=`tput sgr0`
endif

##############################################################################

# Top-level targets
.PHONY: all
all: develop husky

.PHONY: develop
develop:    	## Runs missdev in the local project (mrs.developer.json should be present)
	pnpm develop
	NODE_OPTIONS="--max-old-space-size=16384" pnpm install
	pnpm build:deps

.PHONY: ci-install
ci-install:		## Fetch workspaces and perform an immutable CI install
	pnpm develop
	NODE_OPTIONS="--max-old-space-size=16384" pnpm install --frozen-lockfile
	pnpm build:deps

.PHONY: install
install:		## Install project and add-ons
	NODE_OPTIONS="--max-old-space-size=16384" pnpm install
	pnpm build:deps

.PHONY: build
build:			## Build frontend
	NODE_OPTIONS="--max-old-space-size=16384" pnpm build

.PHONY: bundlewatch
bundlewatch:
	pnpm bundlewatch

.PHONY: husky
husky:			## Install husky git hooks in packages/*
	./scripts/husky.sh

.PHONY: start
start:			## Start frontend
	NODE_OPTIONS="--max-old-space-size=16384" pnpm start

.PHONY: relstorage
relstorage:		## Start frontend w/ RelStorage Plone Backend
	NODE_OPTIONS="--max-old-space-size=16384" RAZZLE_DEV_PROXY_API_PATH=http://localhost:8080/www pnpm start

.PHONY: staging
staging:		## Start frontend w/ Staging Plone Backend
	NODE_OPTIONS="--max-old-space-size=16384" RAZZLE_API_PATH=https://staging.eea.europa.eu RAZZLE_INTERNAL_API_PATH=https://staging.eea.europa.eu pnpm start

.PHONY: demo
demo:		## Start frontend w/ Demo WWW Plone Backend
	NODE_OPTIONS="--max-old-space-size=16384" RAZZLE_API_PATH=https://demo-www.eea.europa.eu RAZZLE_INTERNAL_API_PATH=https://demo-www.eea.europa.eu pnpm start

.PHONY: release
release: 		## Show release candidates
	python3 ./scripts/release.py -s chore -s sonar -v

.PHONY: update
update: 		## git pull all packages
	./scripts/update.sh

.PHONY: issues
issues: 		## Check github for open pull-requests
	python3 ./scripts/pull-requests.py WARN

.PHONY: issues-all
issues-all: 	## Check github for open pull-requests
	python3 ./scripts/pull-requests-volto.py WARN

.PHONY: status
status: 		## Check packages for changes
	./scripts/status.sh

.PHONY: pull
pull: 			## Run git pull on all packages
	./scripts/pull.sh

.PHONY: test
test: 			## Run Jest tests for Volto add-on
	pnpm test

.PHONY: check
check:			## Run static checks and unit tests
	pnpm check

.PHONY: lint
lint:			## Run ESLint, Prettier and Stylelint checks
	pnpm lint
	pnpm prettier
	pnpm stylelint

.PHONY: format
format:			## Apply ESLint, Prettier and Stylelint fixes
	pnpm lint:fix
	pnpm prettier:fix
	pnpm stylelint:fix

.PHONY: typecheck
typecheck:		## Run TypeScript checks for the policy add-on
	pnpm typecheck

.PHONY: i18n
i18n:			## Regenerate translation catalogs
	pnpm i18n

.PHONY: ci-i18n
ci-i18n:		## Verify generated translation catalogs are committed
	pnpm i18n
	git diff --exit-code -- packages/eea-website-frontend/locales

.PHONY: cypress
cypress:		## Run Cypress acceptance tests (uses baseUrl from cypress.config.js)
	pnpm cypress:run

.PHONY: cypress-open
cypress-open:		## Open Cypress interactive test runner
	pnpm cypress:open

.PHONY: cypress-staging
cypress-staging:	## Run Cypress tests against staging
	pnpm cypress:staging

.PHONY: cypress-production
cypress-production:	## Run Cypress tests against production
	pnpm cypress:production

.PHONY: cypress-local
cypress-local:		## Run Cypress tests against localhost:3000
	pnpm cypress:smoke

.PHONY: acceptance-backend-start
acceptance-backend-start:	## Start the official Plone acceptance backend on port 55001
	docker run --rm -p 55001:55001 plone/server-acceptance:6.0

.PHONY: docker-build
docker-build:		## Build the Volto 19 production image
	DOCKER_BUILDKIT=1 docker build --build-arg VOLTO_VERSION=19.3.0 -t eeacms/eea-website-frontend:volto19 .

.PHONY: help
help:			## Show this help.
	@echo -e "$$(grep -hE '^\S+:.*##' $(MAKEFILE_LIST) | sed -e 's/:.*##\s*/:/' -e 's/^\(.\+\):\(.*\)/\\x1b[36m\1\\x1b[m:\2/' | column -c2 -t -s :)"
	head -n 14 Makefile
