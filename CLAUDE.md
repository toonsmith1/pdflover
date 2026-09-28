# PDF Lover: Claude handoff context

Read `AGENTS.md` first; it contains the shared repository rules and current project state.

## Current status

PDF Lover is an active local-first PDF toolbox. The project uses a FastAPI backend and a React 19 + Vite frontend (built to `dist/`, served by FastAPI). The remote repository is `https://github.com/toonsmith1/pdflover.git` on branch `main`.

Almost all catalog operations are implemented locally in both frontend and backend:
- **Organize & Layout**: Merge, Split, Organize/Reorder, Rotate, Crop
- **Content & Annotation**: Add Text (Thai font support), Notes, Watermark, Page Numbers, Digital Signature
- **Conversion & Extraction**: PDF to Images, Images to PDF, Extract Text, Extract Table
- **Security & Privacy**: Protect (password encryption), Unlock, Redact
- **Optimization**: Compress (Ghostscript support)

The only pending tool is remote OCR via Typhoon OCR API.

## Non-negotiable interaction rule

Never collapse upload, editing/selection, processing, and download into one automatic action. For tools involving pages or document content, the user must see an input preview or editor, make or review their choices, explicitly start processing, and then see the generated result before downloading. Preserve this staged workflow when adding new tools; a quick endpoint implementation is incomplete if the UI skips the review stage.

## Architecture

- **Frontend**: React 19 + Vite with `react-router-dom` in `src/`. Components in `src/components/` and `src/components/tools/`.
- **Backend**: FastAPI in `app/main.py`, PDF transformations in `app/pdf_service.py`, partner/ad management in `app/ads_service.py`.
- **Styling**: Clean & minimalist design system with warm neutral tones in `src/styles.css`.
- **Static serving**: Production bundle in `dist/` is mounted and served directly by FastAPI.

## Key files

- `app/main.py`: FastAPI routes, preview rendering, and SPA serving.
- `app/pdf_service.py`: PDF operations and Thai font embedding.
- `app/ads_service.py`: Ads & partner spotlight service.
- `src/App.jsx`, `src/main.jsx`: React entry and routing.
- `src/components/ToolCatalog.jsx`: Catalog page with filters and partner spotlight.
- `src/components/ToolPage.jsx`: Tool layout shell.
- `src/components/tools/`: Dedicated React tool components.
- `src/components/common/`: Shared DropZone, PdfPreview, and PartnerSpotlight.
- `src/styles.css`: Full design system and responsive layout.
- `run.bat`, `run.ps1`: Windows launcher scripts.
- `setup.sh`, `run.sh`: Linux/macOS launcher scripts.

## Run

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

### Development
```bash
# Backend
python -m uvicorn app.main:app --reload

# Frontend dev server (with proxy)
npm run dev
```

Never commit `.env`, uploaded documents, generated PDFs, or `.venv`. Keep OCR remote through Typhoon API; do not add a large local model or GPU requirement to the default install.

## Next work

- Integrate remote Typhoon OCR API.
- Add focused tests in `tests/`.
- Refine error and temporary-file handling.
- Choose and add a license.
