# PDF Lover project context

Treat this file as the current handoff state for Gemini-based agents.

## Status

PDF Lover is a local-first PDF toolbox MVP in `/home/kriangkrai/Documents/pdflover`. The FastAPI server and frontend are already working locally. The latest commit is `5a5830e`; the remote is `https://github.com/toonsmith1/pdflover.git`. A push was attempted but failed only because the machine has no GitHub authentication configured.

Do not assume the project is still at the original static preview stage. Inspect the current files before making changes.

## UX contract

Use a clear separate page for each tool (`/tool/<name>`), with a large upload area first and preview/settings after upload. Do not hide the tools in a grid on the tool page. The home page may show a catalog of tools. The style is restrained Muji: neutral colors, generous whitespace, responsive width, and plain Thai labels.

The merge page must allow selecting files more than once without replacing the existing list. It displays uploaded files as a responsive grid, supports drag-and-drop reorder, individual preview, remove, add more, and merge.

## Architecture

`app/main.py` owns FastAPI routes; `app/pdf_service.py` owns local PDF processing; `frontend/tool.html` is the shared shell; `frontend/upload-flow.js` handles most tool flows; `frontend/merge.js` handles merge-specific behavior; `frontend/styles.css` contains responsive styling. `requirements.txt` is the runtime manifest and `.env.example` documents configuration.

OCR is intentionally remote through Typhoon OCR API. Do not add a large OCR model or GPU-only dependency to the default install.

## Working rules

Keep secrets in `.env`, never frontend code or Git. Prefer small, focused edits. Test with the local server and real small PDFs when changing upload/preview behavior. Check `git status`, `git diff --check`, and do not commit generated secrets, virtual environments, or user documents.
