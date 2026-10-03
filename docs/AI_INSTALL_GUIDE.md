# PDF Lover installation guide for AI assistants

This guide is intended for Claude, Gemini, ChatGPT, Codex, and other coding
assistants helping a user install PDF Lover in a local checkout.

## Safe operating rules

1. Inspect the current directory and run `git status --short` before changing
   anything. Preserve user changes.
2. Never read, print, upload, or commit `.env`, secrets, user uploads, PDFs,
   generated outputs, or private partner configuration.
3. Do not delete files or reset the repository unless the user explicitly asks.
4. Keep the server bound to `127.0.0.1` unless the user explicitly requests a
   different network exposure.
5. Explain any system package or software installation before running it.
6. After setup, verify the app with `GET /api/health` and report the URL.

## Release installation (recommended for ordinary users)

Use a release package that already contains `dist/`. Python is required; Node
is not required to run a prebuilt release.

### Windows

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Linux or macOS

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open <http://127.0.0.1:8000/> after the server starts.

## Developer installation

Use this when the user wants to modify the React frontend:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
npm ci
npm run build
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

On Windows, use the equivalent `.venv\Scripts\python.exe` commands. Keep
`dist/` ignored in source checkouts; it is produced by `npm run build` and can
be attached to a release package.

## Optional dependencies

- **Ghostscript:** needed for image-aware compression. Detect it first. If it
  is missing, offer the official installer/documentation for the user's OS;
  do not silently install it or bundle it without checking its license.
- **WeasyPrint system libraries:** Word to PDF checks both the Python package
  and native Pango/Cairo libraries. If unavailable, show the official
  installation guide and keep the rest of PDF Lover usable.
- **Typhoon OCR:** requires a user-provided `TYPHOON_OCR_API_KEY` in `.env`.
  Do not ask the user to paste the key into chat or commit it.

## Verification checklist

```bash
git status --short
curl http://127.0.0.1:8000/api/health
```

For a developer build, also run `npm run build` and `git diff --check`. Report
warnings separately from failures. Do not claim a feature is verified unless
the relevant command completed successfully.

## Assistant handoff prompt

The user can give an assistant this request:

> Install PDF Lover using `docs/AI_INSTALL_GUIDE.md`. Inspect the current
> checkout first, preserve existing changes, install only the dependencies
> needed for this machine, start the server on `127.0.0.1:8000`, verify
> `/api/health`, and report any optional dependency that remains unavailable.
