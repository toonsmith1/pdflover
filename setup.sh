#!/usr/bin/env bash
set -euo pipefail

PYTHON_BIN="${PYTHON_BIN:-python3}"
"$PYTHON_BIN" -m venv .venv
".venv/bin/python" -m pip install --upgrade pip
".venv/bin/python" -m pip install -r requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example; add your Typhoon OCR API key before using OCR."
fi

if command -v npm >/dev/null 2>&1; then
  echo "Installing frontend dependencies and building React bundle..."
  npm install
  npm run build
fi

echo "Environment ready. Activate it with: source .venv/bin/activate"
