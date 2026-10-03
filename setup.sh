#!/usr/bin/env bash
set -euo pipefail

PYTHON_BIN="${PYTHON_BIN:-python3}"
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "ไม่พบ Python 3.11+ กรุณาติดตั้ง Python ก่อน" >&2; exit 1
fi
if ! "$PYTHON_BIN" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)'; then
  echo "ต้องใช้ Python 3.11 ขึ้นไป" >&2; exit 1
fi
"$PYTHON_BIN" -m venv .venv
".venv/bin/python" -m pip install --upgrade pip
".venv/bin/python" -m pip install -r requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example; add your Typhoon OCR API key before using OCR."
fi

if [ -f "dist/index.html" ]; then
  echo "พบ pre-built UI (dist/index.html) พร้อมใช้งาน"
  if command -v npm >/dev/null 2>&1; then
    read -r -p "ต้องการคอมไพล์ UI ใหม่หรือไม่? (y/N): " rebuild_ui || rebuild_ui="n"
    if [[ "$rebuild_ui" =~ ^[Yy]$ ]]; then
      echo "Installing frontend dependencies and rebuilding React bundle..."
      npm install
      npm run build
    fi
  else
    echo "ข้ามขั้นตอนสร้าง UI (ไม่ต้องติดตั้ง Node.js สำหรับโหมดใช้งานทั่วไป)"
  fi
else
  if ! command -v npm >/dev/null 2>&1; then
    echo "ไม่พบ dist/index.html และไม่พบ npm/Node.js กรุณาติดตั้ง Node.js 18+ หรือดาวน์โหลดชุด Release ที่มี dist/" >&2
    exit 1
  fi
  echo "Installing frontend dependencies and building React bundle..."
  npm install
  npm run build
fi

echo "Environment ready. Activate it with: source .venv/bin/activate"
