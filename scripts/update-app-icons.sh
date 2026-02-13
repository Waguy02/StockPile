#!/usr/bin/env bash
# Update Windows (Electron) and Android app icons from the main Odicam logo.
# Source: app/public/odicam_logo.png
# Run from repo root: ./scripts/update-app-icons.sh

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$REPO_ROOT/app"
ICON_SRC="$APP/public/odicam_logo.png"

if [[ ! -f "$ICON_SRC" ]]; then
  echo "Error: Logo not found at $ICON_SRC" >&2
  exit 1
fi

echo "=== Updating app icons from $ICON_SRC ==="

# Android: copy to all mipmap densities (launcher and adaptive icon foreground)
for dir in mipmap-mdpi mipmap-hdpi mipmap-xhdpi mipmap-xxhdpi mipmap-xxxhdpi; do
  dest="$APP/android/app/src/main/res/$dir"
  if [[ -d "$dest" ]]; then
    cp "$ICON_SRC" "$dest/ic_launcher_foreground.png"
    cp "$ICON_SRC" "$dest/ic_launcher.png"
    cp "$ICON_SRC" "$dest/ic_launcher_round.png"
    echo "  Android: updated $dir"
  fi
done

echo "  Windows/Electron: icon is set in app/package.json build.icon -> public/odicam_logo.png"
echo "  Rebuild the Windows app (npm run build:electron) and Android APK to apply."
echo "Done."
