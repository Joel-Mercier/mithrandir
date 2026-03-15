#!/usr/bin/env bash
# Create a new release: bump version, generate changelog, commit, and tag.
# Usage: scripts/release.sh <version>
# Example: scripts/release.sh 1.1.0

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [ -z "${1:-}" ]; then
  echo "Usage: scripts/release.sh <version>"
  echo "Example: scripts/release.sh 1.1.0"
  exit 1
fi

VERSION="$1"
TAG="v${VERSION}"

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: Working tree has uncommitted changes. Commit or stash them first."
  exit 1
fi

# Check tag doesn't already exist
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Error: Tag $TAG already exists."
  exit 1
fi

# Bump version in package.json (portable sed -i)
if sed --version >/dev/null 2>&1; then
  SED_INPLACE=(sed -i)
else
  SED_INPLACE=(sed -i '')
fi

"${SED_INPLACE[@]}" "s/\"version\": \"[^\"]*\"/\"version\": \"${VERSION}\"/" cli/package.json

# Bump version in docs/.vitepress/config.ts nav dropdown
"${SED_INPLACE[@]}" "s/text: \"v[0-9][^\"]*\"/text: \"${TAG}\"/" docs/.vitepress/config.ts

# Create the tag first (lightweight) so generate-changelog.sh can see it
git add cli/package.json docs/.vitepress/config.ts
git commit -m "release ${TAG}"
git tag "$TAG"

# Generate changelog (now includes the new tag)
"$REPO_ROOT/scripts/generate-changelog.sh"

# Amend the release commit to include the changelog
git add docs/changelog.md
git commit --amend --no-edit

# Move tag to the amended commit
git tag -f "$TAG"

echo ""
echo "Released ${TAG}"
echo "  - Version bumped in package.json and docs config"
echo "  - Changelog generated at docs/changelog.md"
echo "  - Tag ${TAG} created"
echo ""
echo "Push with: git push && git push --tags"
