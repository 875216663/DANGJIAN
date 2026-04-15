#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-4173}"

echo "Preview server is running at http://127.0.0.1:${PORT}"
python3 -m http.server "$PORT" --directory "$ROOT_DIR"
