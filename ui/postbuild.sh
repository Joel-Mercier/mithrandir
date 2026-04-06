#!/bin/sh
# Fix tslib version conflict in Nitro's .nf3 pre-bundled node_modules.
# nf3 symlinks tslib -> tslib@1.14.1 (from tsyringe), but @simplewebauthn
# (used by @better-auth/passkey) needs tslib@2 for __spreadArray etc.
# Repoint the symlink to the v2 copy that nf3 also bundles.

NF3_DIR=".output/server/node_modules/.nf3"
TSLIB_LINK=".output/server/node_modules/tslib"

if [ ! -d "$NF3_DIR" ] || [ ! -L "$TSLIB_LINK" ]; then
  exit 0
fi

# Find tslib@2.x in .nf3
TSLIB2=$(ls -d "$NF3_DIR"/tslib@2.* 2>/dev/null | head -1)
if [ -n "$TSLIB2" ]; then
  ln -sfn ".nf3/$(basename "$TSLIB2")" "$TSLIB_LINK"
fi
