# PDF Lover: AI handoff context

## Current state

This repository is an active MVP, not an empty scaffold. The local FastAPI web app and the browser UI are implemented and have been tested locally.

- Git root: `/home/kriangkrai/Documents/pdflover`
- Main branch: `main`
- Latest local commit: `5a5830e feat: add local-first PDF web app`
- GitHub remote: `https://github.com/toonsmith1/pdflover.git`
- The latest push was blocked because GitHub credentials are not configured in the environment.
- `.env` and `.venv` are local and ignored; never commit secrets.

## Product decisions

- Muji-inspired, calm, spacious visual style.
- One tool per page: `/tool/compress`, `/tool/split`, `/tool/merge`, etc.
- Every tool uses a separate upload step followed by settings/preview.
- Merge supports repeated file selection, multi-file accumulation, grid cards, drag-and-drop ordering, per-file preview, add/remove, and merge.
- Local-first processing is preferred. OCR should use the Typhoon OCR API instead of downloading a large model or requiring a GPU.

## Important files

- `app/main.py`: FastAPI routes and tool catalog.
- `app/pdf_service.py`: local PDF operations; Ghostscript compression presets with pikepdf fallback.
- `app/config.py`: environment configuration.
- `frontend/index.html`: tool catalog/home page.
- `frontend/tool.html`: shared tool shell.
- `frontend/upload-flow.js`: two-step upload/settings flow for non-merge tools.
- `frontend/merge.js`: merge upload, grid preview, ordering, and merge flow.
- `frontend/styles.css`: responsive Muji-style layout and tool UI.
- `requirements.txt`: runtime dependencies.
- `setup.sh`: local setup helper.

## Run and verify

```bash
source .venv/bin/activate
python -m uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/`. Before changing behavior, run `git diff --check`; after changes, smoke-test the affected route and run `ruff check .` when available.

## Next work

Connect remaining catalog tools to real backend operations, add Typhoon OCR service integration, improve error handling and cleanup of temporary files, add meaningful tests, update the stale README status text, and prepare deployment/security documentation. Keep the one-page/one-tool navigation model and avoid adding heavy local AI dependencies.
