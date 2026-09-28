@echo off
setlocal
cd /d "%~dp0"
set HOST=127.0.0.1
set PORT=8000

if not exist .venv\Scripts\python.exe (
    echo [ERROR] .venv not found. Setting up...
    python -m venv .venv
    call .venv\Scripts\python.exe -m pip install -r requirements.txt
    if not exist .env copy .env.example .env
    call npm.cmd install
    call npm.cmd run build
)

echo Starting PDF Lover on http://%HOST%:%PORT% ...
.venv\Scripts\python.exe -m uvicorn app.main:app --host %HOST% --port %PORT% --reload
