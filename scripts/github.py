#!/usr/bin/env python3
"""Shared GitHub helpers for the open pull request scripts.

Authentication, first match wins:

  1. ``gh`` CLI, when installed and logged in (``gh auth login``)
  2. ``GITHUB_TOKEN`` environment variable
  3. ``~/.github`` with a ``[github]`` section holding username/password::

        [github]
        username: foobar
        password: secret #betterleaks:allow

Repositories are checked in parallel (``-j/--jobs`` or ``JOBS``, default 8) and
while they are checked a single line progress counter is updated on stderr
(only when stderr is a terminal).
Output: TSV on stdout with the header
``updated_at, repository, url, author, title``, one row per open pull request,
sorted by ``updated_at`` descending. Drafts are kept and flagged with
``(draft)``. The summary is written to stderr, so stdout stays pipeable.

Pull requests matching an exclude pattern are skipped. The pattern is matched
against the title, labels, branch and author, case insensitive and ignoring
spaces and dashes, so ``-x volto19`` skips ``Volto 19 support`` as well, and
``-x draft`` skips the drafts:

    pull-requests.py WARN -x volto19 -x dependabot
    EXCLUDE="volto19 dependabot" make issues

Exit code: 1 when open pull requests were found, 0 otherwise.
"""

import argparse
import base64
import json
import logging
import os
import re
import shutil
import subprocess  # nosec B404
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from configparser import ConfigParser
from pathlib import Path
from urllib import error, request

API = "https://api.github.com"
TIMEOUT = 15
PER_PAGE = 100

COLUMNS = ("updated_at", "repository", "url", "author", "title")

DEFAULT_JOBS = 8
JOBS_ENV = "JOBS"
EXCLUDE_ENV = "EXCLUDE"
LOGLEVELS = ("fatal", "critical", "error", "warn", "warning", "info", "debug")
PROGRESS_WIDTH = 100


def normalize(text):
    """Normalize text for case and separator insensitive matching"""
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def is_excluded(pull, patterns):
    """Check whether a pull request matches any of the exclude patterns"""
    if not patterns:
        return False
    labels = [label.get("name", "") for label in pull.get("labels") or []]
    head = (pull.get("head") or {}).get("ref", "")
    author = (pull.get("user") or {}).get("login", "")
    state = "draft" if pull.get("draft") else ""
    haystack = normalize(
        " ".join([pull.get("title", ""), *labels, head, author, state])
    )
    return any(normalize(pattern) in haystack for pattern in patterns if pattern)


def patterns_of(flags):
    """Combine ``--exclude`` flags with the ``EXCLUDE`` environment variable"""
    patterns = list(flags or [])
    patterns.extend(re.split(r"[\s,]+", os.environ.get(EXCLUDE_ENV, "")))
    return [pattern for pattern in patterns if pattern]


class Progress:
    """Single line progress counter on stderr, only when stderr is a terminal"""

    def __init__(self, total, stream=None):
        self.total = total
        self.stream = stream if stream is not None else sys.stderr
        self.enabled = self.stream.isatty()
        self.count = 0

    def update(self, label=""):
        """Count one more finished item and redraw the line"""
        self.count += 1
        if not self.enabled:
            return
        text = "[{0:>{2}}/{1}] {3}".format(
            self.count, self.total, len(str(self.total)), label
        )
        self.stream.write("\r" + text[:PROGRESS_WIDTH].ljust(PROGRESS_WIDTH))
        self.stream.flush()

    def done(self):
        """Erase the progress line"""
        if not self.enabled:
            return
        self.stream.write("\r" + " " * PROGRESS_WIDTH + "\r")
        self.stream.flush()


class Github:
    """Minimal GitHub API client, ``gh`` first and token based fallback"""

    def __init__(self, loglevel=logging.WARNING, jobs=DEFAULT_JOBS, excludes=None):
        self.timeout = TIMEOUT
        self.status = 0
        self.jobs = jobs
        self.excludes = excludes or []
        self.username = ""
        self.password = ""  # betterleaks:allow
        self.read_credentials()
        self.token = os.environ.get("GITHUB_TOKEN", "")
        self.gh = shutil.which("gh")
        self._gh_checked = False
        self._gh_works = False
        self._logger = None
        self.loglevel = loglevel

    @property
    def logger(self):
        """Logger"""
        if self._logger:
            return self._logger

        self._logger = logging.getLogger("github")
        self._logger.setLevel(self.loglevel)
        handler = logging.StreamHandler()
        handler.setLevel(self.loglevel)
        handler.setFormatter(logging.Formatter("%(message)s"))
        self._logger.addHandler(handler)
        return self._logger

    @property
    def credentials(self):
        """GitHub credentials from ``~/.github``"""
        return {"username": self.username, "password": self.password}

    def read_credentials(self):
        """Read the GitHub credentials stored in ``~/.github``"""
        cfg_file = Path.home() / ".github"
        if not cfg_file.exists():
            return
        config = ConfigParser()
        config.read([str(cfg_file)])
        if not config.has_section("github"):
            return
        section = config["github"]
        self.username = section.get("username", "")
        self.password = section.get("password", "")  # betterleaks:allow

    def _gh_available(self):
        """Check once that ``gh`` is installed and authenticated"""
        if self._gh_checked:
            return self._gh_works
        self._gh_checked = True
        if not self.gh:
            return False
        try:
            proc = subprocess.run(  # nosec B603
                [self.gh, "auth", "status"],
                capture_output=True,
                timeout=self.timeout,
                check=False,
            )
            self._gh_works = proc.returncode == 0
        except (OSError, subprocess.SubprocessError):
            self._gh_works = False
        if self._gh_works:
            self.logger.debug("Using gh CLI for GitHub API requests")
        return self._gh_works

    def _get_gh(self, path):
        """Request through ``gh api``"""
        proc = subprocess.run(  # nosec B603
            [self.gh, "api", path],
            capture_output=True,
            text=True,
            timeout=self.timeout,
            check=False,
        )
        if proc.returncode != 0:
            raise RuntimeError(proc.stderr.strip() or "gh api failed")
        return json.loads(proc.stdout or "[]")

    def _get_urllib(self, path):
        """Request through urllib, using a token or basic auth"""
        req = request.Request(API + path)
        if self.token:
            req.add_header("Authorization", f"token {self.token}")
        elif self.credentials["username"] or self.credentials["password"]:
            auth = "{username}:{password}".format(**self.credentials)
            req.add_header(
                "Authorization",
                "Basic " + base64.b64encode(auth.encode("utf-8")).decode("ascii"),
            )
        req.add_header("Content-Type", "application/json")
        req.add_header("Accept", "application/json")
        with request.urlopen(req, timeout=self.timeout) as conn:  # nosec B310
            return json.loads(conn.read())

    def get(self, path, params=""):
        """GET a GitHub API path, ``gh`` first, urllib fallback"""
        if self._gh_available():
            try:
                return self._get_gh(path + params)
            except (OSError, RuntimeError, ValueError) as err:
                self.logger.warning("%s \t %s", err, path)

        if not self.token:
            self.logger.debug("Falling back to GITHUB_TOKEN or ~/.github")
        return self._get_urllib(path + params)

    def pulls(self, repo):
        """Return the open pull requests of a repository and the skipped count"""
        path = f"/repos/{repo}/pulls"
        pulls = self.get(path, f"?state=open&per_page={PER_PAGE}")
        rows = []
        skipped = 0
        for pull in pulls:
            if is_excluded(pull, self.excludes):
                skipped += 1
                continue
            title = pull.get("title", "-")
            if pull.get("draft"):
                title = f"{title} (draft)"
            rows.append(
                {
                    "updated_at": pull.get("updated_at", "")[:10],
                    "repository": repo,
                    "url": pull.get("html_url", "-"),
                    "author": (pull.get("user") or {}).get("login", "-"),
                    "title": title,
                }
            )
        return rows, skipped

    def check(self, repos):
        """Check all repositories for open pull requests, in parallel"""
        repos = list(dict.fromkeys(repos))
        self._gh_available()  # probe once, from the main thread
        self.logger.info("Checking %s repositories for open pull requests", len(repos))

        rows = []
        found = set()
        skipped = 0
        progress = Progress(len(repos))
        with ThreadPoolExecutor(max_workers=self.jobs) as pool:
            futures = {pool.submit(self.pulls, repo): repo for repo in repos}
            for future in as_completed(futures):
                repo = futures[future]
                progress.update(repo)
                try:
                    pulls, dropped = future.result()
                except (error.HTTPError, OSError, RuntimeError, ValueError) as err:
                    self.logger.warning("%s \t %s", err, repo)
                    continue
                self.logger.debug("Checked pulls: %s", repo)
                skipped += dropped
                if pulls:
                    found.add(repo)
                rows.extend(pulls)
        progress.done()

        self.write(rows)

        self.logger.warning(
            "Found %s open pull requests in %s %s (%schecked %s)",
            len(rows),
            len(found),
            "repository" if len(found) == 1 else "repositories",
            f"{skipped} excluded, " if skipped else "",
            len(repos),
        )
        self.status = 1 if rows else 0
        return self.status

    @staticmethod
    def write(rows):
        """Write all TSV rows sorted by ``updated_at`` descending"""
        rows.sort(key=lambda row: row["repository"])
        rows.sort(key=lambda row: row["updated_at"], reverse=True)
        print("\t".join(COLUMNS), flush=True)
        for row in rows:
            print("\t".join(row[column] for column in COLUMNS), flush=True)

    __call__ = check


def parse_args(description, patterns=False):
    """Shared CLI arguments: loglevel, parallel jobs and optional patterns"""
    try:
        default_jobs = int(os.environ.get(JOBS_ENV, DEFAULT_JOBS))
    except ValueError:
        default_jobs = DEFAULT_JOBS

    parser = argparse.ArgumentParser(description=description)
    parser.add_argument(
        "loglevel",
        nargs="?",
        default="info",
        type=str.lower,
        choices=LOGLEVELS,
        help="logging level (default: info)",
    )
    parser.add_argument(
        "-j",
        "--jobs",
        type=int,
        default=default_jobs,
        help=f"number of parallel requests (default: {DEFAULT_JOBS}, env: {JOBS_ENV})",
    )
    if patterns:
        parser.add_argument(
            "patterns",
            nargs="*",
            help="repository name patterns to include (default: volto)",
        )
    parser.add_argument(
        "-x",
        "--exclude",
        action="append",
        default=[],
        metavar="PATTERN",
        help="exclude pull requests matching PATTERN in the title, labels, "
        f"branch or author (repeatable, env: {EXCLUDE_ENV})",
    )
    return parser.parse_args()


def loglevel_of(name):
    """Map a loglevel name to the logging module constant"""
    levels = {
        "fatal": logging.FATAL,
        "critical": logging.CRITICAL,
        "error": logging.ERROR,
        "warn": logging.WARNING,
        "warning": logging.WARNING,
        "info": logging.INFO,
        "debug": logging.DEBUG,
    }
    return levels.get(name, logging.INFO)


def run(description, repos):
    """Parse arguments, check the repositories and return the exit code"""
    args = parse_args(description)
    daemon = Github(
        loglevel=loglevel_of(args.loglevel),
        jobs=max(1, args.jobs),
        excludes=patterns_of(args.exclude),
    )
    return daemon.check(repos)
