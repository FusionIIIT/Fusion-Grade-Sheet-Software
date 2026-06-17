#!/usr/bin/env bash
# Fusion Grade Sheet — complete uninstaller for Linux (AppImage).
# Removes app data, caches and desktop integration. Optionally pass the path to
# the .AppImage file to delete it too.
#
# Usage:  bash uninstall-linux.sh ["/path/to/Fusion Grade Sheet-x.y.z.AppImage"]
set -uo pipefail

APP="Fusion Grade Sheet"
VARIANTS=("Fusion Grade Sheet" "fusion-grade-sheet")

echo "This will remove \"$APP\" data, caches and desktop entries."
read -r -p "Continue? [y/N] " ans
[[ "$ans" =~ ^[Yy]$ ]] || { echo "Cancelled."; exit 0; }

# 1) Stop the app if running.
pkill -f "$APP" >/dev/null 2>&1 || true
sleep 1

# 2) Delete the AppImage(s) passed as arguments.
for f in "$@"; do
  if [ -e "$f" ]; then echo "  removing AppImage: $f"; rm -f "$f"; fi
done

# 3) Per-user data, cache and state for every name variant.
for n in "${VARIANTS[@]}"; do
  for d in "$HOME/.config/$n" "$HOME/.cache/$n" "$HOME/.local/share/$n" "$HOME/.local/state/$n"; do
    if [ -e "$d" ]; then echo "  removing: $d"; rm -rf "$d"; fi
  done
done

# 4) Desktop integration (AppImageLauncher / manual .desktop + icons).
shopt -s nullglob
for f in "$HOME/.local/share/applications/"*[Ff]usion*[Gg]rade*[Ss]heet*.desktop; do
  echo "  removing: $f"; rm -f "$f"
done
for f in "$HOME/.local/share/icons/"*[Ff]usion*[Gg]rade*[Ss]heet* \
         "$HOME/.local/share/icons/hicolor/"*/apps/*fusion*grade*sheet*; do
  echo "  removing: $f"; rm -f "$f"
done
update-desktop-database "$HOME/.local/share/applications" >/dev/null 2>&1 || true

echo "✅ \"$APP\" removed."
echo "   (If you didn't pass the .AppImage path, delete that file manually.)"
