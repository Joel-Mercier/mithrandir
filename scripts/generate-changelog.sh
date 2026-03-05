#!/usr/bin/env bash
# Generate changelog markdown from git commits
# Groups all commits under the current version from package.json

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

VERSION=$(grep '"version"' package.json | sed 's/.*"\([0-9][^"]*\)".*/\1/')
TODAY=$(date +%Y-%m-%d)
LATEST_DATE="${PENDING_DATE:-$(git log -1 --format="%as")}"

OUTPUT="$REPO_ROOT/docs/changelog.md"

added=""
fixed=""
changed=""
other=""

categorize() {
  local msg="$1" entry="$2"
  case "$msg" in
    [Aa]dd\ *|[Aa]dd:\ *|[Ff]eat\ *|[Ff]eat:\ *|[Cc]reate\ *)
      added="${added}${entry}"$'\n'
      ;;
    [Ff]ix\ *|[Ff]ix:\ *|[Bb]ugfix\ *)
      fixed="${fixed}${entry}"$'\n'
      ;;
    [Uu]pdate\ *|[Uu]pdate:\ *|[Rr]efactor\ *|[Rr]eorganize\ *|[Rr]ename\ *|[Mm]igrate\ *|[Uu]se\ *|[Ee]nable\ *|[Ss]et\ *|[Hh]ide\ *)
      changed="${changed}${entry}"$'\n'
      ;;
    *)
      other="${other}${entry}"$'\n'
      ;;
  esac
}

while IFS= read -r line; do
  hash="${line%% *}"
  rest="${line#* }"
  date="${rest%% *}"
  msg="${rest#* }"
  short="${hash:0:7}"

  categorize "$msg" "- ${msg} (\`${short}\`)"
done < <(git log --format="%H %as %s" --reverse)

# Include pending commit message (passed from commit-msg hook)
if [ -n "${PENDING_MSG:-}" ]; then
  LATEST_DATE="$TODAY"
  categorize "$PENDING_MSG" "- ${PENDING_MSG}"
fi

{
  cat << 'HEADER'
# Changelog

All notable changes to this project are documented here. This page is auto-generated from git commits.

HEADER

  echo "## v${VERSION} (${LATEST_DATE})"
  echo ""

  if [ -n "$added" ]; then
    echo "### Added"
    echo ""
    printf '%s' "$added"
    echo ""
  fi

  if [ -n "$fixed" ]; then
    echo "### Fixed"
    echo ""
    printf '%s' "$fixed"
    echo ""
  fi

  if [ -n "$changed" ]; then
    echo "### Changed"
    echo ""
    printf '%s' "$changed"
    echo ""
  fi

  if [ -n "$other" ]; then
    echo "### Other"
    echo ""
    printf '%s' "$other"
    echo ""
  fi
} > "$OUTPUT"

echo "Generated changelog at $OUTPUT"
