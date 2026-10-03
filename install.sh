#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"
PYTHON_BIN="${PYTHON_BIN:-python3}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "ไม่พบ Python 3.11+ กรุณาติดตั้ง Python ก่อน" >&2
  exit 1
fi
if ! "$PYTHON_BIN" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)'; then
  echo "ต้องใช้ Python 3.11 ขึ้นไป" >&2
  exit 1
fi

if [ ! -x .venv/bin/python ]; then
  "$PYTHON_BIN" -m venv .venv
fi
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
fi

if [ ! -f dist/index.html ]; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "ไม่พบ dist และ npm; ติดตั้ง Node.js 18+ หรือใช้ชุด Release ที่มี dist/" >&2
    exit 1
  fi
  npm ci
  npm run build
fi

echo "ติดตั้งเสร็จแล้ว เริ่มใช้งานด้วย: ./run.sh"
