#!/usr/bin/env bash
# Generate changelog markdown from git commits, grouped by tags.
# Commits after the latest tag appear under "Unreleased".

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

OUTPUT="$REPO_ROOT/docs/changelog.md"

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

write_section() {
  local title="$1" content="$2"
  if [ -n "$content" ]; then
    echo "### $title"
    echo ""
    printf '%s' "$content"
    echo ""
  fi
}

# Collect commits for a given git log range into categories, then write them
write_commits_for_range() {
  local range="$1"
  added="" fixed="" changed="" other=""
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    hash="${line%% *}"
    rest="${line#* }"
    msg="${rest#* }"
    short="${hash:0:7}"
    categorize "$msg" "- ${msg} (\`${short}\`)"
  done < <(git log --format="%H %as %s" --reverse $range)

  write_section "Added" "$added"
  write_section "Fixed" "$fixed"
  write_section "Changed" "$changed"
  write_section "Other" "$other"
}

# Get all tags sorted by version (newest first)
TAGS=()
while IFS= read -r t; do
  [ -n "$t" ] && TAGS+=("$t")
done < <(git tag --sort=-version:refname 2>/dev/null || true)

{
  cat << 'HEADER'
# Changelog

All notable changes to this project are documented here. This page is auto-generated from git commits grouped by release tags.

HEADER

  if [ ${#TAGS[@]} -eq 0 ]; then
    # No tags — list all commits under "Unreleased"
    LATEST_DATE="$(git log -1 --format='%as' 2>/dev/null || date +%Y-%m-%d)"
    echo "## Unreleased (${LATEST_DATE})"
    echo ""
    write_commits_for_range ""
  else
    # Unreleased commits (after latest tag)
    latest_tag="${TAGS[0]}"
    unreleased_count="$(git rev-list --count "${latest_tag}..HEAD")"
    if [ "$unreleased_count" -gt 0 ]; then
      LATEST_DATE="$(git log -1 --format='%as')"
      echo "## Unreleased (${LATEST_DATE})"
      echo ""
      write_commits_for_range "${latest_tag}..HEAD"
    fi

    # Tagged versions (newest first)
    for i in "${!TAGS[@]}"; do
      tag="${TAGS[$i]}"
      tag_date="$(git log -1 --format='%as' "$tag")"

      if [ $((i + 1)) -lt ${#TAGS[@]} ]; then
        prev_tag="${TAGS[$((i + 1))]}"
        range="${prev_tag}..${tag}"
      else
        range="$tag"
      fi

      echo "## ${tag} (${tag_date})"
      echo ""
      write_commits_for_range "$range"
    done
  fi
} > "$OUTPUT"

echo "Generated changelog at $OUTPUT"
