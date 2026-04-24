#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ADDONS_ROOT="${FRONTEND_ROOT}/src/addons"

SLEEP_MINUTES=7
TARGET_BRANCH="volto-18-eslint"
BASE_BRANCH="develop"
COMMIT_PREFIX="chore: Volto 18 eslint/jest migration - refs #301881"
DRY_RUN=0
DRAFT_PR=0
SKIP_PR=0
AUTO_YES=0
ADDONS_FILE=""
ADDONS=()

usage() {
  cat <<'EOF'
Usage:
  scripts/batch-addon-prs.sh [options] [<addon> [<addon> ...]]

Options:
  --addons-file <file>    File with add-ons (one per line, # for comments)
  --addons-root <path>    Add-ons parent folder for name-only args
                          (default: src/addons under the frontend checkout)
  --branch <name>         Branch that must be active in each add-on repo
                          (default: volto-18-eslint)
  --base <name>           PR base branch (default: develop)
  --commit-prefix <text>  Commit message prefix
                          (default: "chore: Volto 18 eslint/jest migration - refs #301881")
  --sleep-minutes <n>     Sleep duration between add-ons (default: 7)
  --draft                 Create draft PRs
  --no-pr                 Skip PR creation (only add/commit/push)
  --dry-run               Print actions without executing
  --yes                   Do not ask for confirmation
  -h, --help              Show this help

Examples:
  scripts/batch-addon-prs.sh \
    volto-widget-dataprovenance \
    volto-widget-geolocation

  cd src/addons
  ../../scripts/batch-addon-prs.sh --yes

  # from monorepo root:
  frontend/scripts/batch-addon-prs.sh \
    --addons-file /tmp/addons.txt \
    --sleep-minutes 10 \
    --draft
EOF
}

die() {
  echo "Error: $*" >&2
  exit 1
}

run_cmd() {
  if (( DRY_RUN )); then
    printf '[DRY-RUN] '
    printf '%q ' "$@"
    printf '\n'
  else
    "$@"
  fi
}

trim() {
  local s="$1"
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  printf '%s' "$s"
}

load_addons_file() {
  local file="$1"
  [[ -f "$file" ]] || die "addons file not found: $file"

  local line
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="$(trim "$line")"
    [[ -n "$line" ]] && ADDONS+=("$line")
  done < "$file"
}

detect_default_base_branch() {
  git remote show origin 2>/dev/null | sed -n '/HEAD branch/s/.*: //p'
}

is_same_dir() {
  local left="$1"
  local right="$2"
  [[ -d "$left" && -d "$right" ]] || return 1
  [[ "$(cd "$left" && pwd)" == "$(cd "$right" && pwd)" ]]
}

is_addon_repo_dir() {
  local dir="$1"
  [[ -d "$dir/.git" && -f "$dir/package.json" ]]
}

collect_addons_from_dir() {
  local dir="$1"
  [[ -d "$dir" ]] || return 0
  local entry
  while IFS= read -r entry; do
    [[ -n "$entry" ]] && ADDONS+=("$entry")
  done < <(find "$dir" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort)
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --addons-file)
      [[ $# -ge 2 ]] || die "--addons-file requires a value"
      ADDONS_FILE="$2"
      shift 2
      ;;
    --branch)
      [[ $# -ge 2 ]] || die "--branch requires a value"
      TARGET_BRANCH="$2"
      shift 2
      ;;
    --addons-root)
      [[ $# -ge 2 ]] || die "--addons-root requires a value"
      ADDONS_ROOT="$2"
      shift 2
      ;;
    --base)
      [[ $# -ge 2 ]] || die "--base requires a value"
      BASE_BRANCH="$2"
      shift 2
      ;;
    --commit-prefix)
      [[ $# -ge 2 ]] || die "--commit-prefix requires a value"
      COMMIT_PREFIX="$2"
      shift 2
      ;;
    --sleep-minutes)
      [[ $# -ge 2 ]] || die "--sleep-minutes requires a value"
      [[ "$2" =~ ^[0-9]+$ ]] || die "--sleep-minutes must be an integer"
      SLEEP_MINUTES="$2"
      shift 2
      ;;
    --draft)
      DRAFT_PR=1
      shift
      ;;
    --no-pr)
      SKIP_PR=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --yes)
      AUTO_YES=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      die "unknown option: $1"
      ;;
    *)
      ADDONS+=("$1")
      shift
      ;;
  esac
done

if [[ -n "$ADDONS_FILE" ]]; then
  load_addons_file "$ADDONS_FILE"
fi

if [[ -d "$ADDONS_ROOT" ]]; then
  ADDONS_ROOT="$(cd "$ADDONS_ROOT" && pwd)"
fi

if (( ${#ADDONS[@]} == 0 )); then
  if is_addon_repo_dir "$PWD"; then
    ADDONS+=("$PWD")
  elif is_same_dir "$PWD" "$ADDONS_ROOT"; then
    collect_addons_from_dir "$PWD"
  else
    collect_addons_from_dir "$ADDONS_ROOT"
  fi
fi

(( ${#ADDONS[@]} > 0 )) || die "no add-ons found/provided"

if (( ! SKIP_PR )) && (( ! DRY_RUN )); then
  command -v gh >/dev/null 2>&1 || die "gh CLI not found in PATH"
fi

echo "Frontend root:   ${FRONTEND_ROOT}"
echo "Add-ons root:     ${ADDONS_ROOT}"
echo "Target branch:    ${TARGET_BRANCH}"
echo "Base branch:      ${BASE_BRANCH}"
echo "Commit prefix:    ${COMMIT_PREFIX}"
echo "Sleep minutes:    ${SLEEP_MINUTES}"
echo "Create PRs:       $(( SKIP_PR ? 0 : 1 ))"
echo "Draft PRs:        ${DRAFT_PR}"
echo "Dry run:          ${DRY_RUN}"
echo "Add-ons (${#ADDONS[@]}): ${ADDONS[*]}"
echo

if (( ! AUTO_YES )); then
  read -r -p "Continue? [y/N] " confirm
  case "${confirm}" in
    y|Y|yes|YES) ;;
    *) echo "Aborted."; exit 0 ;;
  esac
fi

for idx in "${!ADDONS[@]}"; do
  addon="${ADDONS[$idx]}"
  did_publish=0

  if [[ -d "$addon/.git" ]]; then
    addon_dir="$(cd "$addon" && pwd)"
  elif [[ -d "${PWD}/${addon}/.git" ]]; then
    addon_dir="$(cd "${PWD}/${addon}" && pwd)"
  elif [[ -d "${ADDONS_ROOT}/${addon}/.git" ]]; then
    addon_dir="$(cd "${ADDONS_ROOT}/${addon}" && pwd)"
  else
    addon_dir="${ADDONS_ROOT}/${addon}"
  fi

  echo
  echo "=== [$((idx + 1))/${#ADDONS[@]}] ${addon} ==="

  if [[ ! -d "$addon_dir" ]]; then
    echo "Skip: directory not found: ${addon_dir}"
    continue
  fi

  if [[ ! -d "${addon_dir}/.git" ]]; then
    echo "Skip: not a git repository: ${addon_dir}"
    continue
  fi

  pushd "$addon_dir" >/dev/null

  current_branch="$(git branch --show-current)"
  if [[ "$current_branch" != "$TARGET_BRANCH" ]]; then
    echo "Skip: current branch is '${current_branch}', expected '${TARGET_BRANCH}'"
    popd >/dev/null
    continue
  fi

  run_cmd git add -A

  if git diff --cached --quiet; then
    echo "No staged changes. Skipping commit/push/PR."
    popd >/dev/null
  else
    commit_message="${COMMIT_PREFIX} (${addon})"
    run_cmd git commit -m "$commit_message"
    run_cmd git push -u origin "$TARGET_BRANCH"
    did_publish=1

    if (( ! SKIP_PR )); then
      effective_base="$BASE_BRANCH"
      if [[ -z "$effective_base" ]]; then
        effective_base="$(detect_default_base_branch || true)"
      fi

      if [[ -z "$effective_base" ]]; then
        echo "Could not detect base branch. Skipping PR creation."
      else
        existing_pr="$(gh pr list --state open --head "$TARGET_BRANCH" --json number --jq '.[0].number // empty' || true)"
        if [[ -n "$existing_pr" ]]; then
          echo "Open PR already exists: #${existing_pr}"
        else
          pr_cmd=(gh pr create --title "$COMMIT_PREFIX" --head "$TARGET_BRANCH" --base "$effective_base" --fill)
          (( DRAFT_PR )) && pr_cmd+=(--draft)
          run_cmd "${pr_cmd[@]}"
        fi
      fi
    fi

    popd >/dev/null
  fi

  if (( did_publish )) && (( idx < ${#ADDONS[@]} - 1 )); then
    echo "Sleeping ${SLEEP_MINUTES} minute(s) before next add-on..."
    run_cmd sleep "$((SLEEP_MINUTES * 60))"
  fi
done

echo
echo "Done."
