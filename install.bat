@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>nul
if errorlevel 1 (
  echo ไม่พบ Python กรุณาติดตั้ง Python 3.11+ ก่อน
  exit /b 1
)

if not exist .venv\Scripts\python.exe py -3 -m venv .venv
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -r requirements.txt

if not exist .env copy .env.example .env >nul

if not exist dist\index.html (
  where npm >nul 2>nul
  if errorlevel 1 (
    echo ไม่พบ dist และ npm กรุณาติดตั้ง Node.js 18+ หรือใช้ชุด Release ที่มี dist/
    exit /b 1
  )
  call npm.cmd ci
  call npm.cmd run build
)

echo ติดตั้งเสร็จแล้ว เริ่มใช้งานด้วย run.bat
endlocal
