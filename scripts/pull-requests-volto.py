#!/usr/bin/env python3
"""List open pull requests for all the eea org repositories matching a pattern.

By default every repository with ``volto`` in its name is checked, which covers
all the Volto add-ons maintained in the ``eea`` organization.

Usage::

    pull-requests-volto.py [loglevel] [-j JOBS] [-x PATTERN ...] [pattern ...]

Examples::

    pull-requests-volto.py WARN
    pull-requests-volto.py WARN volto-taxonomy volto-sentry
    pull-requests-volto.py WARN -x volto19

See ``scripts/github.py`` for the authentication order, the TSV output and the
exit code (1 when open pull requests were found, 0 otherwise).
"""

import sys

import github

ORG = "eea"
DEFAULT_PATTERN = "volto"


def org_repos(daemon, patterns):
    """Return the ``ORG/<repo>`` names matching the given patterns"""
    repositories = []
    page = 1
    while True:
        batch = daemon.get(
            f"/orgs/{ORG}/repos",
            f"?per_page={github.PER_PAGE}&page={page}",
        )
        if not batch:
            break
        daemon.logger.debug("Read page %s: %s repositories", page, len(batch))
        for repo in batch:
            full_name = repo.get("full_name", "")
            if any(pattern in full_name for pattern in patterns):
                repositories.append(full_name)
        if len(batch) < github.PER_PAGE:
            break
        page += 1
    return repositories


if __name__ == "__main__":
    ARGS = github.parse_args(
        "List open pull requests for all eea repositories matching a pattern",
        patterns=True,
    )
    DAEMON = github.Github(
        loglevel=github.loglevel_of(ARGS.loglevel),
        jobs=max(1, ARGS.jobs),
        excludes=github.patterns_of(ARGS.exclude),
    )
    REPOS = org_repos(DAEMON, ARGS.patterns or [DEFAULT_PATTERN])
    sys.exit(DAEMON.check(REPOS))
