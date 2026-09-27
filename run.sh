#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"
if [ ! -x .venv/bin/python ]; then
  echo "ยังไม่ได้ติดตั้งระบบ กรุณารัน ./setup.sh ก่อน" >&2
  exit 1
fi
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8000}"
exec .venv/bin/python -m uvicorn app.main:app --host "$HOST" --port "$PORT"
