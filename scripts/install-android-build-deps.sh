#!/usr/bin/env bash
# Install dependencies required to build the OdicamStock Android APK.
# Run with: sudo ./scripts/install-android-build-deps.sh
# Tested on Debian/Ubuntu.

set -e

if [[ $EUID -ne 0 ]]; then
  echo "This script must be run with sudo (root)." >&2
  echo "Usage: sudo $0" >&2
  exit 1
fi

# --- Config (match app/android) ---
ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-/opt/android-sdk}"
# Android API level from app/android/variables.gradle (compileSdkVersion 35)
ANDROID_API_LEVEL="${ANDROID_API_LEVEL:-35}"
# Command-line tools version (stable); update from https://developer.android.com/studio#command-tools
ANDROID_CMDLINE_VERSION="${ANDROID_CMDLINE_VERSION:-11076708}"
CMDLINE_URL="https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_CMDLINE_VERSION}_latest.zip"

echo "=== Installing Java 21 and utilities ==="
# Capacitor Android requires Java 21 (source release 21). AGP 8 needs at least Java 17.
# Continue even if some third-party PPAs fail (e.g. missing Release); Java is from main repos
apt-get update -qq || true
if ! apt-get install -y openjdk-21-jdk unzip wget; then
  echo ""
  echo "Install failed. If you see errors about missing Release files, disable the broken PPAs:"
  echo "  sudo add-apt-repository --remove ppa:camel-neeraj/sysmontask"
  echo "  sudo add-apt-repository --remove ppa:gezakovacs/ppa"
  echo "  Then run this script again."
  exit 1
fi

echo "=== Setting default Java to 21 ==="
update-alternatives --set java "$(update-alternatives --list java | grep -E 'java-21|openjdk-21' | head -1)" 2>/dev/null || true
update-alternatives --set javac "$(update-alternatives --list javac | grep -E 'java-21|openjdk-21' | head -1)" 2>/dev/null || true

echo "=== Installing Android SDK to ${ANDROID_SDK_ROOT} ==="
mkdir -p "${ANDROID_SDK_ROOT}"
cd "${ANDROID_SDK_ROOT}"

if [[ ! -d cmdline-tools/latest ]]; then
  echo "Downloading Android command-line tools..."
  TMP_DIR=$(mktemp -d)
  TMP_ZIP="${TMP_DIR}/cmdline-tools.zip"
  wget -q -O "$TMP_ZIP" "$CMDLINE_URL" || {
    echo "Download failed. Try setting ANDROID_CMDLINE_VERSION or check network." >&2
    rm -rf "$TMP_DIR"
    exit 1
  }
  unzip -q -o "$TMP_ZIP" -d "$TMP_DIR"
  # Zip contains one top-level dir (cmdline-tools or tools) with bin/, lib/, etc.
  INNER=$(find "$TMP_DIR" -maxdepth 1 -mindepth 1 -type d | head -1)
  if [[ -z "$INNER" ]] || [[ ! -f "${INNER}/bin/sdkmanager" ]]; then
    # Some zips have bin at top level
    if [[ -x "${TMP_DIR}/bin/sdkmanager" ]]; then
      INNER="$TMP_DIR"
    else
      echo "Unexpected cmdline-tools zip layout in $TMP_DIR" >&2
      ls -la "$TMP_DIR" && ls -la "${INNER:-.}" 2>/dev/null
      rm -rf "$TMP_DIR"
      exit 1
    fi
  fi
  mkdir -p cmdline-tools
  mv "$INNER" cmdline-tools/latest
  rm -rf "$TMP_DIR"
  if [[ ! -x cmdline-tools/latest/bin/sdkmanager ]]; then
    echo "sdkmanager not found at cmdline-tools/latest/bin/sdkmanager" >&2
    find cmdline-tools -name sdkmanager 2>/dev/null || true
    exit 1
  fi
  echo "Command-line tools installed."
else
  echo "Command-line tools already present, skipping download."
fi

export ANDROID_HOME="${ANDROID_SDK_ROOT}"
export PATH="${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${PATH}"

echo "=== Accepting SDK licenses and installing platform components ==="
yes 2>/dev/null | sdkmanager --sdk_root="${ANDROID_SDK_ROOT}" --licenses || true
sdkmanager --sdk_root="${ANDROID_SDK_ROOT}" "platform-tools"
sdkmanager --sdk_root="${ANDROID_SDK_ROOT}" "platforms;android-${ANDROID_API_LEVEL}"
sdkmanager --sdk_root="${ANDROID_SDK_ROOT}" "build-tools;35.0.0"
sdkmanager --sdk_root="${ANDROID_SDK_ROOT}" "build-tools;34.0.0"

# So the user who ran sudo can run Gradle without root (and so Gradle can install components if needed)
if [[ -n "${SUDO_USER}" ]]; then
  echo "=== Making SDK writable by ${SUDO_USER} ==="
  chown -R "${SUDO_USER}:${SUDO_USER}" "${ANDROID_SDK_ROOT}"
fi

echo "=== Writing environment file ==="
ENV_FILE="/etc/profile.d/odicam-android-build.sh"
cat > "$ENV_FILE" << EOF
# OdicamStock Android build environment (added by install-android-build-deps.sh)
export ANDROID_HOME="${ANDROID_SDK_ROOT}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT}"
export PATH="\${ANDROID_HOME}/cmdline-tools/latest/bin:\${ANDROID_HOME}/platform-tools:\${PATH}"
# Use Java 21 for Gradle/AGP and Capacitor (requires source release 21)
if command -v update-alternatives >/dev/null 2>&1; then
  JAVA21=\$(update-alternatives --list java 2>/dev/null | grep -E 'java-21|openjdk-21' | head -1)
  if [[ -n "\$JAVA21" ]]; then
    export JAVA_HOME=\$(dirname "\$(dirname "\$JAVA21")")
  fi
fi
EOF
chmod 644 "$ENV_FILE"
echo "Created ${ENV_FILE}"

echo ""
echo "=== Optional: Node.js (for building the web app) ==="
if command -v node >/dev/null 2>&1; then
  echo "Node.js already installed: \$(node -v)"
else
  echo "To install Node.js 20 LTS (optional, for 'npm run build:android'):"
  echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
  echo "  sudo apt-get install -y nodejs"
fi

echo ""
echo "=== Done ==="
echo "  ANDROID_SDK_ROOT = ${ANDROID_SDK_ROOT}"
echo "  Java 21 and Android SDK (platform-tools, platform ${ANDROID_API_LEVEL}, build-tools 34/35) are installed."
echo ""
echo "To use in this shell: source ${ENV_FILE}"
echo "Then from the project: cd app && npm run build:apk"
echo "Or create app/android/local.properties with: sdk.dir=${ANDROID_SDK_ROOT}"
