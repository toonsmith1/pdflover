@echo off
setlocal
cd /d "%~dp0"

if exist .git\NUL (
    echo Pulling the latest source from GitHub...
    git pull --ff-only
    if errorlevel 1 exit /b 1
    if exist dist rmdir /s /q dist
    call install.bat
    if errorlevel 1 exit /b 1
    echo Update complete. Start again with run.bat
    exit /b 0
)

echo This folder is not a Git checkout.
echo Download the newest GitHub Release and replace this folder.
echo Keep your .env and personal data before replacing it.
exit /b 1
