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
#    make test src/addons/volto-accordion-block
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
	npx -p mrs-developer missdev --config=jsconfig.json --output=addons --fetch-https
	@echo "$(MARK_COLOR)Applying workspace protocol for development...$(NO_COLOR)"
	node scripts/apply-workspace-protocol.js
	NODE_OPTIONS="--max-old-space-size=16384" pnpm i
	node scripts/restore-production-package.js

.PHONY: install
install: ## Installs the add-on in a development environment
	pnpm dlx mrs-developer missdev --no-config --fetch-https
	pnpm i
	make build-deps

.PHONY: start
start: ## Starts Volto, allowing reloading of the add-on during development
	pnpm start

.PHONY: build
build: ## Build a production bundle for distribution of the project with the add-on
	pnpm build

core/packages/registry/dist: $(shell find core/packages/registry/src -type f)
	pnpm --filter @plone/registry build

core/packages/components/dist: $(shell find core/packages/components/src -type f)
	pnpm --filter @plone/components build

.PHONY: build-deps
build-deps: core/packages/registry/dist core/packages/components/dist ## Build dependencies

.PHONY: i18n
i18n: ## Sync i18n
	pnpm --filter $(ADDON_NAME) i18n

.PHONY: ci-i18n
ci-i18n: ## Check if i18n is not synced
	pnpm --filter $(ADDON_NAME) i18n && git diff -G'^[^\"POT]' --exit-code

.PHONY: format
format: ## Format codebase
	pnpm lint:fix
	pnpm prettier:fix
	pnpm stylelint:fix

.PHONY: lint
lint: ## Lint, or catch and remove problems, in code base
	pnpm lint
	pnpm prettier
	pnpm stylelint --allow-empty-input

.PHONY: release
release: ## Release the add-on on npmjs.org
	pnpm release

.PHONY: release-dry-run
release-dry-run: ## Dry-run the release of the add-on on npmjs.org
	pnpm release

.PHONY: test
test: ## Run unit tests
	pnpm test

.PHONY: ci-test
ci-test: ## Run unit tests in CI
	# Unit Tests need the i18n to be built
	VOLTOCONFIG=$(pwd)/volto.config.js pnpm --filter @plone/volto i18n
	CI=1 RAZZLE_JEST_CONFIG=$(CURRENT_DIR)/jest-addon.config.js pnpm run --filter @plone/volto test --passWithNoTests


.PHONY: bundlewatch
bundlewatch:
	pnpm bundlewatch --config .bundlewatch.config.json

.PHONY: husky
husky:			## Install husky git hooks in src/addons/*
	./scripts/husky.sh

.PHONY: relstorage
relstorage:		## Start frontend w/ RelStorage Plone Backend
	NODE_OPTIONS="--max-old-space-size=16384" RAZZLE_DEV_PROXY_API_PATH=http://localhost:8080/www pnpm start

.PHONY: staging
staging:		## Start frontend w/ Staging Plone Backend
	NODE_OPTIONS="--max-old-space-size=16384" RAZZLE_API_PATH=https://staging.eea.europa.eu RAZZLE_INTERNAL_API_PATH=https://staging.eea.europa.eu pnpm start

.PHONY: demo
demo:		## Start frontend w/ Demo WWW Plone Backend
	NODE_OPTIONS="--max-old-space-size=16384" RAZZLE_API_PATH=https://demo-www.eea.europa.eu RAZZLE_INTERNAL_API_PATH=https://demo-www.eea.europa.eu pnpm start

.PHONY: omelette
omelette: 		## Creates the omelette folder that contains a link to the installed version of Volto (a softlink pointing to node_modules/@plone/volto)
	if [ ! -d omelette ]; then ln -sf node_modules/@plone/volto omelette; fi

.PHONY: patches
patches:
	/bin/bash patches/patchit.sh > /dev/null 2>&1 ||true

.PHONY: clean
clean: ## Clean environment
	@echo "$(RED)==> Cleaning Volto core and node_modules$(RESET)"
	rm -rf core node_modules

.PHONY: release
release: 		## Show release candidates
	python3 ./scripts/release.py -s chore -s sonar -v

.PHONY: update
update: 		## git pull all src/addons
	./scripts/update.sh

.PHONY: issues
issues: 		## Check github for open pull-requests
	./scripts/pull-requests.py WARN

.PHONY: issues-all
issues-all: 	## Check github for open pull-requests
	./scripts/pull-requests-volto.py WARN

.PHONY: status
status: 		## Check src/addons for changes
	./scripts/status.sh

.PHONY: pull
pull: 			## Run git pull on all src/addons
	./scripts/pull.sh


.PHONY: cypress-staging
cypress-staging:	## Run Cypress tests against staging
	CYPRESS_BASE_URL=https://staging.eea.europa.eu/en pnpm cypress:run

.PHONY: cypress-production
cypress-production:	## Run Cypress tests against production
	CYPRESS_BASE_URL=https://www.eea.europa.eu/en pnpm cypress:run

.PHONY: cypress-local
cypress-local:		## Run Cypress tests against localhost:3000
	CYPRESS_BASE_URL=http://localhost:3000 pnpm cypress:run

.PHONY: help
help:			## Show this help.
	@echo -e "$$(grep -hE '^\S+:.*##' $(MAKEFILE_LIST) | sed -e 's/:.*##\s*/:/' -e 's/^\(.\+\):\(.*\)/\\x1b[36m\1\\x1b[m:\2/' | column -c2 -t -s :)"
	head -n 14 Makefile

.PHONY: backend-docker-start
backend-docker-start:	## Starts a Docker-based backend for development
	@echo "$(GREEN)==> Start Docker-based Plone Backend$(RESET)"
	docker run -it --rm --name=backend -p 8080:8080 -e SITE=Plone $(DOCKER_IMAGE)

## Storybook
.PHONY: storybook-start
storybook-start: ## Start Storybook server on port 6006
	@echo "$(GREEN)==> Start Storybook$(RESET)"
	pnpm run storybook

.PHONY: storybook-build
storybook-build: ## Build Storybook
	@echo "$(GREEN)==> Build Storybook$(RESET)"
	mkdir -p $(CURRENT_DIR)/.storybook-build
	pnpm run storybook-build -o $(CURRENT_DIR)/.storybook-build

## Acceptance
.PHONY: acceptance-frontend-dev-start
acceptance-frontend-dev-start: ## Start acceptance frontend in development mode
	RAZZLE_API_PATH=http://127.0.0.1:55001/plone pnpm start

.PHONY: acceptance-frontend-prod-start
acceptance-frontend-prod-start: ## Start acceptance frontend in production mode
	RAZZLE_API_PATH=http://127.0.0.1:55001/plone pnpm build && pnpm start:prod

.PHONY: acceptance-backend-start
acceptance-backend-start: ## Start backend acceptance server
	docker run -it --rm -p 55001:55001 $(DOCKER_IMAGE_ACCEPTANCE)

.PHONY: ci-acceptance-backend-start
ci-acceptance-backend-start: ## Start backend acceptance server in headless mode for CI
	docker run -i --rm -p 55001:55001 $(DOCKER_IMAGE_ACCEPTANCE)

.PHONY: acceptance-test
acceptance-test: ## Start Cypress in interactive mode
	pnpm --filter @plone/volto exec cypress open --config-file $(CURRENT_DIR)/cypress.config.js --config specPattern=$(CURRENT_DIR)'/cypress/tests/**/*.{js,jsx,ts,tsx}'

.PHONY: ci-acceptance-test
ci-acceptance-test: ## Run cypress tests in headless mode for CI
	pnpm --filter @plone/volto exec cypress run --config-file $(CURRENT_DIR)/cypress.config.js --config specPattern=$(CURRENT_DIR)'/cypress/tests/**/*.{js,jsx,ts,tsx}'

.PHONY: build-image
build-image:  ## Build Docker Image
	@DOCKER_BUILDKIT=1 docker build . -t $(IMAGE_NAME):$(IMAGE_TAG) -f Dockerfile --build-arg VOLTO_VERSION=$(VOLTO_VERSION)

