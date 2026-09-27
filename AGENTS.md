# Agent instructions for PDF Lover

## Current project state

PDF Lover is an active local-first PDF toolbox MVP in `/home/kriangkrai/Documents/pdflover`.

- Backend: FastAPI in `app/`; frontend: plain HTML, CSS, and JavaScript in `frontend/`.
- Main branch is `main`; GitHub remote is `git@github.com:toonsmith1/pdflover.git`.
- At the start of this handoff, local and GitHub `main` were synchronized at `faf3d6d` (`feat: lay out PDF text editor workspace`).
- `.env` and `.venv` are local and ignored. Never commit secrets, virtual environments, generated PDFs, or user uploads.
- Check `git status` before editing and preserve any existing user changes.

## Product and UX contract

1. Keep one route/page per tool: `/tool/<tool_name>`.
2. Most tools use a separate file-selection step followed by tool settings and preview.
3. Merge accepts files across repeated selections, shows a responsive grid, supports reorder, individual preview, removal, add-more, and merge.
4. The text editor has three stages: select a PDF; edit text over a rendered page image; process and inspect the resulting PDF before downloading. Do not show the source PDF viewer while placing text.
5. Text editing supports multiple text items, each with editable Thai text, position, size, font, and color. All non-empty items are embedded in the generated PDF. The editor is a DOM/CSS overlay on a rendered PDF image.
6. Keep the restrained Muji visual style, responsive layout, Thai UI labels, and lightweight frontend.
7. OCR is intended to use the remote Typhoon OCR API. Do not add a large local OCR model or GPU-only dependency to default installation.

## Implemented PDF operations

The backend currently implements merge, split, compress, rotate, organize/reorder, crop, and add-text. It also has PDF page-count and image-preview routes. Other catalog menus still need backend implementations, including OCR, watermark, page numbering, signature, image conversion, extraction, protection/unlock, and redaction.

## Important files

- `app/main.py`: FastAPI API and page routes.
- `app/pdf_service.py`: PDF transformations and Thai font embedding.
- `app/config.py`: environment configuration.
- `frontend/index.html`, `frontend/app.js`: home tool catalog.
- `frontend/tool.html`, `frontend/tool.js`: shared tool shell and form behavior.
- `frontend/upload-flow.js`: upload and settings stages.
- `frontend/merge.js`: merge-specific upload, order, and preview flow.
- `frontend/organize.js`: page reordering UI.
- `frontend/text-preview.js`: image-based multi-text editor and processing stages.
- `frontend/styles.css`: responsive UI and editor styles.
- `requirements.txt`, `requirements-dev.txt`, `setup.sh`: dependencies and setup.

## Running the app

```bash
source .venv/bin/activate
python -m uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/`. Run `git diff --check` before committing. For code changes, validate the affected behavior and run available checks such as `ruff check .` and relevant tests.

## Open work

- Implement remaining catalog operations, prioritizing watermark and page numbering after the current add-text editor.
- Add Typhoon OCR API integration and document its data flow.
- Improve temporary-file/error handling and add meaningful tests.
- Update README status text and production/deployment/licensing guidance.
