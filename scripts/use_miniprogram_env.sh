#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_ENV="${1:-}"

usage() {
  cat <<EOF
Usage:
  $(basename "$0") <local|test|prod>

Examples:
  $(basename "$0") test
  $(basename "$0") prod
EOF
}

if [[ -z "$TARGET_ENV" ]]; then
  usage
  exit 1
fi

SOURCE_FILE="$ROOT_DIR/miniprogram/utils/cloud-config.${TARGET_ENV}.js"
TARGET_FILE="$ROOT_DIR/miniprogram/utils/cloud-config.js"

if [[ ! -f "$SOURCE_FILE" ]]; then
  echo "Error: unsupported mini program environment: $TARGET_ENV"
  usage
  exit 1
fi

cp "$SOURCE_FILE" "$TARGET_FILE"
echo "Mini program config switched to: $TARGET_ENV"
