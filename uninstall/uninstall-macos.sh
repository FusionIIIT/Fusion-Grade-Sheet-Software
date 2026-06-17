#!/usr/bin/env bash
# Fusion Grade Sheet — complete uninstaller for macOS.
# Removes the app AND every hidden support/cache/preference file it can create.
#
# Usage:  bash uninstall-macos.sh
set -uo pipefail

APP="Fusion Grade Sheet"
BUNDLE="in.ac.iiitdmj.fusiongradesheet"

echo "This will completely remove \"$APP\" and ALL of its data from this Mac."
read -r -p "Continue? [y/N] " ans
[[ "$ans" =~ ^[Yy]$ ]] || { echo "Cancelled."; exit 0; }

# 1) Quit the app if it's running.
osascript -e "tell application \"$APP\" to quit" >/dev/null 2>&1 || true
pkill -f "$APP.app" >/dev/null 2>&1 || true
sleep 1

# 2) Every location Electron / macOS may store data for this app.
PATHS=(
  "/Applications/$APP.app"
  "$HOME/Applications/$APP.app"
  "$HOME/Library/Application Support/$APP"
  "$HOME/Library/Application Support/fusion-grade-sheet"
  "$HOME/Library/Caches/$APP"
  "$HOME/Library/Caches/$BUNDLE"
  "$HOME/Library/Caches/$BUNDLE.ShipIt"
  "$HOME/Library/Preferences/$BUNDLE.plist"
  "$HOME/Library/Preferences/$BUNDLE.helper.plist"
  "$HOME/Library/Saved Application State/$BUNDLE.savedState"
  "$HOME/Library/Logs/$APP"
  "$HOME/Library/HTTPStorages/$BUNDLE"
  "$HOME/Library/HTTPStorages/$BUNDLE.binarycookies"
  "$HOME/Library/WebKit/$BUNDLE"
  "$HOME/Library/Application Scripts/$BUNDLE"
)

for p in "${PATHS[@]}"; do
  if [ -e "$p" ]; then echo "  removing: $p"; rm -rf "$p"; fi
done

# 3) Flush any cached defaults.
defaults delete "$BUNDLE" >/dev/null 2>&1 || true

# 4) Forget any installer receipts (harmless if none).
pkgutil --forget "$BUNDLE" >/dev/null 2>&1 || true

echo "✅ \"$APP\" and all its data have been removed."
