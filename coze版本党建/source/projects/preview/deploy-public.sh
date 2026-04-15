#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="$ROOT_DIR/bin"
CLOUDFLARED_BIN="$BIN_DIR/cloudflared"
PORT="${PORT:-4173}"

mkdir -p "$BIN_DIR"

download_cloudflared() {
  if [ -x "$CLOUDFLARED_BIN" ]; then
    return 0
  fi

  local archive="$BIN_DIR/cloudflared-darwin-arm64.tgz"
  echo "Downloading cloudflared..."
  curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz" -o "$archive"
  tar -xzf "$archive" -C "$BIN_DIR"
  chmod +x "$CLOUDFLARED_BIN"
  rm -f "$archive"
}

wait_for_local_site() {
  for _ in $(seq 1 20); do
    if curl -fsS "http://127.0.0.1:${PORT}" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

download_cloudflared

echo "Starting local preview server on http://127.0.0.1:${PORT}"
python3 -m http.server "$PORT" --directory "$ROOT_DIR" >/tmp/party_preview_server.log 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}

trap cleanup EXIT

if ! wait_for_local_site; then
  echo "Local preview server failed to start."
  exit 1
fi

echo "Creating public tunnel..."
"$CLOUDFLARED_BIN" tunnel --url "http://127.0.0.1:${PORT}"
