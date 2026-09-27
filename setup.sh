#!/usr/bin/env bash
set -euo pipefail

PYTHON_BIN="${PYTHON_BIN:-python3}"
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "ไม่พบ Python 3.11+ กรุณาติดตั้ง Python ก่อน" >&2; exit 1
fi
if ! "$PYTHON_BIN" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)'; then
  echo "ต้องใช้ Python 3.11 ขึ้นไป" >&2; exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "ไม่พบ npm/Node.js กรุณาติดตั้ง Node.js 18+ ก่อน" >&2; exit 1
fi
"$PYTHON_BIN" -m venv .venv
".venv/bin/python" -m pip install --upgrade pip
".venv/bin/python" -m pip install -r requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example; add your Typhoon OCR API key before using OCR."
fi

echo "Installing frontend dependencies and building React bundle..."
npm install
npm run build

echo "Environment ready. Activate it with: source .venv/bin/activate"
