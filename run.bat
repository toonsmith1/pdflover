@echo off
setlocal
cd /d "%~dp0"
set HOST=127.0.0.1
set PORT=8000

if not exist .venv\Scripts\python.exe (
    echo [.venv not found. Setting up Python virtual environment...]
    python -m venv .venv
    call .venv\Scripts\python.exe -m pip install -r requirements.txt
    if not exist .env copy .env.example .env
    if not exist dist\index.html (
        where npm >nul 2>nul
        if %ERRORLEVEL% equ 0 (
            echo Building frontend bundle...
            call npm.cmd install
            call npm.cmd run build
        ) else (
            echo [WARNING] dist\index.html and npm not found. UI may not be served correctly.
        )
    )
)

echo Starting PDF Lover on http://%HOST%:%PORT% ...
.venv\Scripts\python.exe -m uvicorn app.main:app --host %HOST% --port %PORT% --reload
