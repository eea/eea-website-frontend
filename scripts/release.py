#!/usr/bin/env python3
""" Release candidates
"""
import json
import os
import subprocess
import argparse
import urllib.request

VOLTO = "https://raw.githubusercontent.com/plone/volto/refs/heads/main/packages/volto/package.json"
ADDONS = "packages"
CORE = os.path.join("core", "packages", "volto", "package.json")
KITKAT = os.path.join(
    "packages", "volto-eea-kitkat", "packages", "volto-eea-kitkat", "package.json"
)


def git(path, *args):
    """ Run git in path and return decoded stdout
    """
    proc = subprocess.run(
        ["git", "-C", path, *args], stdout=subprocess.PIPE, check=False
    )
    return proc.stdout.decode("utf-8", errors="replace")


def default_branch(path):
    """ Remote default branch of an add-on, e.g. origin/master
    """
    ref = git(path, "symbolic-ref", "--short", "refs/remotes/origin/HEAD").strip()
    if ref:
        return ref
    for candidate in ("origin/master", "origin/main", "master", "main"):
        if git(path, "rev-parse", "--verify", "--quiet", candidate).strip():
            return candidate
    return "HEAD"


def last_release(path):
    """ Latest released tag reachable from the add-on default branch
    """
    return git(path, "describe", "--tags", "--abbrev=0", default_branch(path)).strip()


def kitkat_addons():
    """ Add-ons bundled by volto-eea-kitkat
    """
    if not os.path.exists(KITKAT):
        return set()
    with open(KITKAT, "r", encoding='utf-8') as ofile:
        config = json.load(ofile)
    return {
        package
        for package in config.get("dependencies", {})
        if package.startswith("@eeacms/")
    }


def dev_volto():
    """ Volto version in development
    """
    if not os.path.exists(CORE):
        return "UNKNOWN"
    with open(CORE, "r", encoding='utf-8') as ofile:
        return json.load(ofile).get("version", "UNKNOWN")


def main(verbose, skip):
    """ Main
    """
    to_be_release = []
    kitkat = kitkat_addons()

    # Get LATEST
    with urllib.request.urlopen(VOLTO) as ofile:
        latest_volto = json.load(ofile)['version']

    # Add-ons
    with open("mrs.developer.json", "r", encoding='utf-8') as ofile:
        config = json.load(ofile)

    for addon, settings in config.items():
        if not settings.get("develop"):
            continue

        path = os.path.join(settings.get("output", ADDONS), addon)
        release = last_release(path)
        if not release:
            to_be_release.append(f"{addon}: (no release tag)")
            continue

        res = git(path, "log", "--pretty=oneline", "--abbrev-commit", f"{release}..HEAD")
        commits = []
        for commit in res.split('\n'):
            if not commit.strip():
                continue
            skip_me = False
            if skip:
                for skip_c in skip:
                    if skip_c in str(commit.lower()):
                        skip_me = True
                        break
            if skip_me:
                continue
            commits.append(commit)

        if commits:
            package = f"@eeacms/{addon}"
            prefix = "KITKAT" if package in kitkat else "FRONT"
            to_be_release.append(f"{prefix}:\t {addon}: {release} ->")
            if verbose:
                print(f"==================== {path} ")
                print("\n".join(commits))

    # Volto
    print("======== @plone/volto ")
    dev = dev_volto()
    if dev != latest_volto:
        print(f"DEV: \t @plone/volto: {dev} -> {latest_volto}")

    return to_be_release


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('-v', '--verbose', help='Verbose', action='store_true')
    parser.add_argument('-s', '--skip',
        help='Skip commits: e.g.: -s sonarqube', action='append', default=[])
    args = parser.parse_args()
    RES = "\n".join(
        main(args.verbose, args.skip)
    )
    print(f"======== Add-ons to be released: \n{RES}")
