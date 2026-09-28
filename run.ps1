$HostAddr = if ($env:HOST) { $env:HOST } else { "127.0.0.1" }
$Port = if ($env:PORT) { $env:PORT } else { "8000" }

if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "Creating Python virtual environment (.venv)..." -ForegroundColor Cyan
    python -m venv .venv
    & .venv\Scripts\python.exe -m pip install -r requirements.txt
    if (-not (Test-Path ".env")) {
        Copy-Item .env.example .env
    }
    npm.cmd install
    npm.cmd run build
}

Write-Host "Starting PDF Lover on http://$HostAddr`:$Port ..." -ForegroundColor Green
& .venv\Scripts\python.exe -m uvicorn app.main:app --host $HostAddr --port $Port --reload
