#!/usr/bin/env python3
""" Github utils
"""
import base64
import contextlib
import csv
import json
import logging
import os
import sys
from configparser import ConfigParser
from datetime import datetime
from urllib import request


class Github(object):
    """ Usage: github.py <loglevel> <logpath> <exclude>

    loglevel:
      - fatal    Log only critical errors
      - critical Log only critical errors
      - error    Log only errors
      - warn     Log only warnings
      - warning  Log only warnings
      - info     Log only status messages (default)
      - debug    Log all messages

    logpath:
      - . current directory (default)

      - "var/log"  relative path to current directory (e.g.
         <current directory>/var/log/github.log)

      - "/var/log" - absoulute path (e.g. /var/log/github.log)

    include:

      - include packages, space separated.

    Within your home directory you need to provide a .github file that stores
    github username and password like::

    [github]
    username: foobar
    password: secret

    """
    def __init__(self,
        github="https://api.github.com/orgs/eea/repos?per_page=100&page=%s",
        timeout=15,
        loglevel=logging.INFO,
        logpath='.',
        include=None):

        self.github = github
        self.timeout = timeout
        self.status = 0
        self.repos = []
        self.username = ''
        self.password = ''
        self.token = os.environ.get("GITHUB_TOKEN", "")
        self._output = csv.writer(sys.stdout, delimiter="\t", lineterminator="\n")
        self._header_written = False

        self.loglevel = loglevel
        self._logger = None
        self.logpath = logpath
        if include:
            self.logger.info("Include %s", ', '.join(include))
            self.include = include
        else:
            self.include = []

    @property
    def credentials(self):
        """ Get github credentials
        """
        if not (self.username or self.password):
            cfg_file = os.path.expanduser("~/.github")
            if os.path.exists(cfg_file):
                config = ConfigParser()
                config.read([cfg_file])
                if config.has_section('github'):
                    self.username = config.get('github', 'username', fallback='')
                    self.password = config.get('github', 'password', fallback='')

        return {
            'username': self.username,
            'password': self.password,
        }

    def request(self, url):
        """ Complex request
        """
        req = request.Request(url)
        if self.token:
            req.add_header("Authorization", "token %s" % self.token)
        elif self.credentials['username'] or self.credentials['password']:
            auth = "%(username)s:%(password)s" % self.credentials
            req.add_header(
                "Authorization",
                "Basic " + base64.b64encode(auth.encode("utf-8")).decode("ascii"),
            )
        req.add_header("Content-Type", "application/json")
        req.add_header("Accept", "application/json")
        return req

    @property
    def logger(self):
        """ Logger
        """
        if self._logger:
            return self._logger

        # Setup logger
        self._logger = logging.getLogger('github')
        self._logger.setLevel(self.loglevel)
        fh = logging.FileHandler(os.path.join(self.logpath, 'github.log'))
        fh.setLevel(logging.INFO)
        ch = logging.StreamHandler()
        ch.setLevel(logging.DEBUG)
        formatter = logging.Formatter(
            '%(asctime)s - %(lineno)3d - %(levelname)7s - %(message)s')
        fh.setFormatter(formatter)
        ch.setFormatter(formatter)
        self._logger.addHandler(fh)
        self._logger.addHandler(ch)
        return self._logger

    def check_pulls(self, repo):
        """ Check if any open pull for repo
        """
        name = repo.get('full_name', '')
        include = False
        if not self.include:
            include = True
        else:
            for pattern in self.include:
                if pattern in name:
                    include = True
                    break

        if not include:
            return

        self.logger.info('Checking repo pulls: %s', name)
        url = repo.get('url', '') + '/pulls'
        try:
            with contextlib.closing(request.urlopen(
                self.request(url), timeout=self.timeout)) as conn:
                pulls = json.loads(conn.read())
                for pull in pulls:
                    self.status = 1
                    updated_at = datetime.strptime(
                        pull.get("updated_at", ""), "%Y-%m-%dT%H:%M:%SZ"
                    )
                    self.write_row(
                        updated_at.strftime("%Y-%m-%d"),
                        name,
                        pull.get('html_url', '-'),
                        (pull.get('user') or {}).get('login', '-'),
                        pull.get('title', '-'),
                    )
        except Exception as err:
            self.logger.exception(err)

        url = repo.get('url', '') + '/forks'
        try:
            with contextlib.closing(request.urlopen(
                self.request(url), timeout=self.timeout)) as conn:
                forks = json.loads(conn.read())
                for fork in forks:
                    if '/collective/' in fork.get('url', ''):
                        self.check_pulls(fork)
                        break
        except Exception as err:
            self.logger.exception(err)

    def check_repo(self, repo):
        """ Sync repo
        """
        # Open pulls
        self.check_pulls(repo)

    def check_repos(self):
        """ Check all repos
        """
        count = len(self.repos)
        self.logger.info('Checking %s repositories found at %s',
                         count, self.github)

        start = datetime.now()
        for repo in self.repos:
            self.check_repo(repo)
        end = datetime.now()
        self.logger.info('DONE Checking %s repositories in %s seconds',
                         count, (end - start).seconds)

    def start(self):
        """ Start syncing
        """
        self.repos = []
        self.ensure_header()
        links = [self.github % count for count in range(1,100)]
        try:
            for link in links:
                with contextlib.closing(request.urlopen(
                        self.request(link), timeout=self.timeout)) as conn:
                    repos = json.loads(conn.read())
                    if not repos:
                        break
                    self.logger.info('Adding repositories from %s',  link)
                    self.repos.extend(repos)
            self.check_repos()
        except Exception as err:
            self.logger.exception(err)

    __call__ = start

    def write_row(self, updated_at, repository, pull_url, author, title):
        """Write one TSV row for spreadsheet-friendly output."""
        self.ensure_header()
        self._output.writerow([updated_at, repository, pull_url, author, title])

    def ensure_header(self):
        """Write the TSV header once."""
        if not self._header_written:
            self._output.writerow(["updated_at", "repository", "url", "author", "title"])
            self._header_written = True

if __name__ == "__main__":
    LOG = len(sys.argv) > 1 and sys.argv[1] or 'info'
    if LOG.lower() not in ('fatal', 'critical', 'error',
                           'warn', 'warning', 'info', 'debug'):
        print(Github.__doc__)
        sys.exit(1)

    if LOG.lower() in ['fatal', 'critical']:
        LOGLEVEL = logging.FATAL
    elif LOG.lower() == 'error':
        LOGLEVEL = logging.ERROR
    elif LOG.lower() in ['warn', 'warning']:
        LOGLEVEL = logging.WARNING
    elif LOG.lower() == 'info':
        LOGLEVEL = logging.INFO
    else:
        LOGLEVEL = logging.DEBUG

    PATH = len(sys.argv) > 2 and sys.argv[2] or '/tmp/'

    INCLUDE = len(sys.argv) > 3 and sys.argv[3:] or ['volto-']

    daemon = Github(loglevel=LOGLEVEL, logpath=PATH, include=INCLUDE)
    daemon.start()

    sys.exit(daemon.status)
