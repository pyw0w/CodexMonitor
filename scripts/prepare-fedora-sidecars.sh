#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_TAURI_DIR="${REPO_ROOT}/src-tauri"

TARGET_TRIPLE="${TAURI_TARGET_TRIPLE:-${CARGO_BUILD_TARGET:-$(rustc -vV | awk '/^host: / { print $2 }')}}"

echo "[fedora-sidecars] Building daemon binaries for target: ${TARGET_TRIPLE}"
(
  cd "${SRC_TAURI_DIR}"
  cargo build --release --target "${TARGET_TRIPLE}" --bin codex_monitor_daemon --bin codex_monitor_daemonctl
)

RELEASE_DIR="${SRC_TAURI_DIR}/target/${TARGET_TRIPLE}/release"
if [[ ! -d "${RELEASE_DIR}" ]]; then
  echo "[fedora-sidecars] Expected release directory not found: ${RELEASE_DIR}" >&2
  exit 1
fi

mkdir -p "${SRC_TAURI_DIR}/binaries"
cp "${RELEASE_DIR}/codex_monitor_daemon" "${SRC_TAURI_DIR}/binaries/codex_monitor_daemon-${TARGET_TRIPLE}"
cp "${RELEASE_DIR}/codex_monitor_daemonctl" "${SRC_TAURI_DIR}/binaries/codex_monitor_daemonctl-${TARGET_TRIPLE}"
chmod 755 "${SRC_TAURI_DIR}/binaries/codex_monitor_daemon-${TARGET_TRIPLE}" "${SRC_TAURI_DIR}/binaries/codex_monitor_daemonctl-${TARGET_TRIPLE}"

echo "[fedora-sidecars] Prepared sidecars in src-tauri/binaries for ${TARGET_TRIPLE}"
