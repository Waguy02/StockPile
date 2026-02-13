#!/usr/bin/env bash
# Build the Windows installer (NSIS) for StockPILE Electron app.
# Produces an installer .exe that installs the app and creates the desktop exe/shortcuts.
#
# Run from repo root: ./scripts/build-windows-setup.sh
#
# Requirements:
#   - Node.js and npm
#   - On Linux: Wine (optional but recommended for building Windows exe from Linux)
#   - On Windows: run in PowerShell or Git Bash; no Wine needed
#
# Output: app/dist_electron/*.exe (NSIS installer)

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${REPO_ROOT}/app"
OUT_DIR="${APP_DIR}/dist_electron"

echo "=== Building Windows setup (installer) ==="
echo "  Repo root: ${REPO_ROOT}"
echo "  App dir:   ${APP_DIR}"
echo ""

# --- Check Node/npm ---
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Error: Node.js and npm are required. Install them and try again." >&2
  exit 1
fi

# --- Optional: on Linux, warn if Wine is missing (needed for cross-compiling Windows exe) ---
if [[ "$(uname -s)" == "Linux" ]]; then
  if ! command -v wine >/dev/null 2>&1; then
    echo "Warning: Wine is not installed. Building Windows app from Linux usually requires Wine." >&2
    echo "  Install with: sudo apt install wine (or your distro's package)." >&2
    echo "  Continuing anyway; electron-builder may fail for win target." >&2
    echo ""
  fi
fi

# --- Install app dependencies if needed ---
if [[ ! -d "${APP_DIR}/node_modules" ]]; then
  echo "=== Installing dependencies ==="
  cd "${APP_DIR}"
  npm ci
  cd "${REPO_ROOT}"
  echo ""
fi

# --- Build web assets + Electron main, then run electron-builder for Windows ---
echo "=== 1/3 Web build ==="
cd "${APP_DIR}"
npm run build

echo "=== 2/3 Electron main build ==="
npm run build:electron

echo "=== 3/3 electron-builder (Windows NSIS installer) ==="
npx electron-builder --win

# --- Report result ---
echo ""
if [[ -d "${OUT_DIR}" ]]; then
  echo "=== Windows build finished ==="
  echo "  Output directory: ${OUT_DIR}"
  echo ""
  echo "  Installer(s):"
  ls -la "${OUT_DIR}"/*.exe 2>/dev/null || true
  echo ""
  echo "  Install the app on Windows by running the .exe installer."
else
  echo "Error: Output directory not found: ${OUT_DIR}" >&2
  exit 1
fi
