#!/usr/bin/env python3
"""List open pull requests for the add-ons used by this frontend.

The add-ons are read from ``jsconfig.json`` (``compilerOptions.paths``) and
mapped to their GitHub repositories: ``@eeacms/<name>`` ->
``eea/<name>``, ``@plone-collective/<name>`` -> ``collective/<name>``.

Usage::

    pull-requests.py [loglevel] [-j JOBS]

See ``scripts/github.py`` for the authentication order, the TSV output and the
exit code (1 when open pull requests were found, 0 otherwise).
"""

import json
import sys
from pathlib import Path
from urllib import error, request

import github

FRONTEND_DIR = Path(__file__).resolve().parents[1]
JSCONFIG = FRONTEND_DIR / "jsconfig.json"
JSCONFIG_URL = (
    "https://raw.githubusercontent.com/eea/eea-website-frontend/develop/jsconfig.json"
)


def config():
    """Return the jsconfig content, local first and remote as fallback"""
    if JSCONFIG.exists():
        return json.loads(JSCONFIG.read_text())

    with request.urlopen(JSCONFIG_URL, timeout=github.TIMEOUT) as conn:  # nosec B310
        return json.loads(conn.read())


def repos():
    """Return the GitHub repositories of the add-ons used by this frontend"""
    paths = config()["compilerOptions"]["paths"]
    repositories = []
    for package in paths:
        if package.startswith("@eeacms/"):
            org, name = "eea", package.replace("@eeacms/", "")
        elif package.startswith("@plone-collective/"):
            org, name = "collective", package.replace("@plone-collective/", "")
        else:
            continue
        repositories.append(f"{org}/{name}")
    return repositories


if __name__ == "__main__":
    try:
        sys.exit(
            github.run(
                "List open pull requests for the add-ons used by this frontend",
                repos(),
            )
        )
    except error.HTTPError as err:
        print(f"Unable to read {JSCONFIG}: {err}", file=sys.stderr)
        sys.exit(1)
