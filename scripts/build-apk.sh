#!/usr/bin/env bash
# Build a debug APK for the Android app (Capacitor).
# Run from repo root: ./scripts/build-apk.sh
# Requires: Node.js, npm, Java 17+, Android SDK (ANDROID_HOME or app/android/local.properties).

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${REPO_ROOT}/app"
ANDROID_DIR="${APP_DIR}/android"
APK_DEBUG="${ANDROID_DIR}/app/build/outputs/apk/debug/app-debug.apk"

echo "=== Building APK (debug) ==="
echo "  Repo root: ${REPO_ROOT}"
echo ""

# --- Prereqs: node & npm ---
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Error: Node.js and npm are required. Install them and try again." >&2
  exit 1
fi

# --- Optional: ensure Android SDK is visible to Gradle ---
LOCAL_PROP="${ANDROID_DIR}/local.properties"
if [[ ! -f "${LOCAL_PROP}" ]]; then
  SDK_DIR=""
  if [[ -n "${ANDROID_HOME}" && -d "${ANDROID_HOME}" ]]; then
    SDK_DIR="${ANDROID_HOME}"
  elif [[ -n "${ANDROID_SDK_ROOT}" && -d "${ANDROID_SDK_ROOT}" ]]; then
    SDK_DIR="${ANDROID_SDK_ROOT}"
  fi
  if [[ -n "${SDK_DIR}" ]]; then
    echo "Creating ${LOCAL_PROP} with sdk.dir=${SDK_DIR}"
    echo "sdk.dir=${SDK_DIR}" > "${LOCAL_PROP}"
  else
    echo "Warning: ${LOCAL_PROP} not found and ANDROID_HOME/ANDROID_SDK_ROOT not set." >&2
    echo "  Create app/android/local.properties with: sdk.dir=/path/to/Android/Sdk" >&2
    echo "  Or install deps with: sudo ./scripts/install-android-build-deps.sh" >&2
    echo "  Then: source /etc/profile.d/odicam-android-build.sh" >&2
    exit 1
  fi
fi

# --- 1. Web build ---
echo "=== 1/3 Web build ==="
cd "${APP_DIR}"
npm run build

# --- 2. Capacitor sync ---
echo "=== 2/3 Capacitor sync Android ==="
npx cap sync android

# --- 3. Gradle assembleDebug ---
echo "=== 3/3 Gradle assembleDebug ==="
cd "${ANDROID_DIR}"
./gradlew assembleDebug

if [[ -f "${APK_DEBUG}" ]]; then
  echo ""
  echo "=== APK built successfully ==="
  echo "  ${APK_DEBUG}"
  echo ""
  echo "Install on a device: adb install -r ${APK_DEBUG}"
else
  echo "Error: APK not found at ${APK_DEBUG}" >&2
  exit 1
fi
