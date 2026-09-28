# PDF Lover project handoff for Gemini

Read `AGENTS.md` before editing. It contains shared behavior requirements and repository guidance.

## Repository state

- Project: Local-first PDF toolbox
- Backend: FastAPI/Python in `app/`
- Frontend: React 19 + Vite in `src/` (builds to `dist/`, served by FastAPI with fallback to `frontend/`)
- Git branch: `main`; GitHub remote: `https://github.com/toonsmith1/pdflover.git` (or `git@github.com:toonsmith1/pdflover.git`)
- The local `.env` and `.venv` are ignored and must stay out of Git.

Implemented PDF operations (both backend & React UI):
- **Organize & Layout**: Merge, Split, Organize/Reorder, Rotate, Crop
- **Content & Annotation**: Add Text, Notes, Watermark, Page Numbers, Digital Signature
- **Conversion & Extraction**: PDF to Images (ZIP), Images to PDF, Extract Text, Extract Table
- **Security & Privacy**: Protect, Unlock, Redact
- **Optimization**: Compress

Pending backend implementation: Remote Typhoon OCR API.

## Required workflow for every document tool

Do not implement a bare upload-and-process flow for tools where the user can select pages, place content, edit, reorder, crop, rotate, annotate, or otherwise affect the document. Show an input preview/editor first, require an explicit processing action, then show the generated output preview before download. Apply the same rule to all document tools: thumbnail selection and review must happen before conversion.

## Frontend architecture (React + Vite)

The frontend is built with React 19 + Vite with `react-router-dom`:
- Component architecture in `src/components/` (Home catalog, tool shell, common DropZone & PdfPreview, individual tool components in `src/components/tools/`).
- State and drag-drop interactions are managed declaratively in React.
- Clean & minimalist design system with warm neutral tones in `src/styles.css`.
- Python/FastAPI serves all `/api/*` endpoints and serves `dist/index.html` on `/` and `/tool/<tool_name>`.

## Partner spotlight and version updates

- Home catalog uses a compact split-grid hero (60% branding & search, 40% partner card).
- Partner spotlight (`src/components/common/PartnerSpotlight.jsx`): Displays lightweight, clean recommendation cards (e.g. Shopee affiliate with product thumbnail & price, or partner tools). Cached for 24h. When offline or on fetch failure, automatically flips to "Buy Me a Coffee ☕".
- Version update notification: Checks lightweight remote manifest (e.g. GitHub raw `version.json`) daily. Non-intrusive UI (titlebar badge or dismissible banner).
- Private monetization manifests and local secret configs remain strictly git-ignored (`.gitignore`).

## Important files

- `app/main.py`: API and SPA page routes, serving `dist/` bundle.
- `app/pdf_service.py`: PDF transformations and font embedding.
- `app/ads_service.py`: Partner spotlight and campaign handling.
- `src/App.jsx`, `src/main.jsx`: React entry point and routing.
- `src/components/ToolCatalog.jsx`: Home catalog and category filters.
- `src/components/ToolPage.jsx`: Tool layout shell.
- `src/components/tools/`: Dedicated React tool components.
- `src/components/common/`: Shared DropZone, PdfPreview, and PartnerSpotlight components.
- `src/styles.css`: Full design system and responsive layout.
- `package.json`, `vite.config.js`: Vite build configuration.
- `run.bat`, `run.ps1`: Windows launcher scripts.
- `setup.sh`, `run.sh`: Linux/macOS launcher scripts.

Keep the minimalist neutral style, one route per tool, and OCR through Typhoon's remote API. Do not add a GPU-only or large local OCR dependency.

## Run and continue

### Windows
```powershell
.\run.bat
# or
.\run.ps1
```

### Linux / macOS
```bash
./run.sh
```

Before editing, inspect `git status` and the current source. Run `git diff --check` before committing. Never add `.env`, `.venv`, user PDFs, or generated output.

Next likely tasks: integrate Typhoon OCR API, add focused tests in `tests/`, improve error/temp-file handling, and add project licensing.
