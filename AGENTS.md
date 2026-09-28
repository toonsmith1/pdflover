# Agent instructions for PDF Lover

## Current project state

PDF Lover is an active local-first PDF toolbox MVP.

- Backend: FastAPI in `app/`; frontend: React 19 + Vite in `src/` (built to `dist/`, served by FastAPI with fallback to `frontend/`).
- Main branch is `main`; GitHub remote is `https://github.com/toonsmith1/pdflover.git` (or `git@github.com:toonsmith1/pdflover.git`).
- `.env` and `.venv` are local and ignored. Never commit secrets, virtual environments, generated PDFs, or user uploads.
- Check `git status` before editing and preserve any existing user changes.

## Product and UX contract

### Required staged workflow

Do not shortcut a document tool from upload directly to processing when the user needs to choose, edit, arrange, crop, place, or inspect content. Such tools must show an intermediate preview/editor stage first, let the user review the selected pages and settings, and only then process. After processing, show the result preview before download. This applies to page selection, image conversion, text, notes, signatures, watermark, page numbers, crop, rotate, split, organize, merge, and similar tools. If a tool has no meaningful editable state, still show the input preview and a clear processing action.

1. Keep one route/page per tool: `/tool/<tool_name>`.
2. Most tools use a separate file-selection step followed by tool settings and preview.
3. Merge accepts files across repeated selections, shows a responsive grid, supports reorder, individual preview, removal, add-more, and merge.
4. The text editor has three stages: select a PDF; edit text over a rendered page image; process and inspect the resulting PDF before downloading. Do not show the source PDF viewer while placing text.
5. Text editing supports multiple text items, each with editable Thai text, position, size, font, and color. All non-empty items are embedded in the generated PDF. The editor is a DOM/CSS overlay on a rendered PDF image.
6. Keep the restrained minimalist visual style, responsive layout, Thai UI labels, and lightweight frontend.
7. OCR is intended to use the remote Typhoon OCR API. Do not add a large local OCR model or GPU-only dependency to default installation.
8. Partner spotlight & monetization contract: Display native, clean recommendation card (e.g. Shopee affiliate / partner tools) on the homepage split hero. Must be bandwidth-efficient (<1 KB JSON manifest), cached for 24h, and automatically fallback to "Buy Me a Coffee ☕" when offline. Never use intrusive popups, tracking SDKs, or malware-like scripts. All private partner/ad configs remain git-ignored.
9. Version update notification contract: Check for new releases via lightweight remote manifest (e.g. GitHub raw `version.json`), cached daily. Use non-intrusive UI indicators (titlebar version badge dot or dismissible banner). Silently skip when offline.

## Implemented PDF operations

The backend and frontend currently implement:
- **Organize & Layout**: Merge, Split, Organize/Reorder, Rotate, Crop
- **Content & Annotation**: Add Text (with Thai font support), Notes, Watermark, Page Numbers, Digital Signature
- **Conversion & Extraction**: PDF to Images (ZIP), Images to PDF, Extract Text, Extract Table
- **Security & Privacy**: Protect (password encryption), Unlock, Redact (black-out sensitive areas)
- **Optimization**: Compress (with Ghostscript downsampling support when installed)

Pending integrations: Typhoon OCR API endpoint wiring.

## Important files

- `app/main.py`: FastAPI API, static bundle serving, and SPA routes.
- `app/pdf_service.py`: PDF transformations and Thai font embedding.
- `app/ads_service.py`: Partner spotlight and campaign handling.
- `app/config.py`: Environment configuration.
- `src/App.jsx`, `src/main.jsx`: React entry and routing.
- `src/components/ToolCatalog.jsx`: Home catalog page.
- `src/components/ToolPage.jsx`: Tool layout shell.
- `src/components/tools/`: Individual tool implementations (TextTool, MergeTool, OrganizeTool, CompressTool, SplitTool, RotateTool, CropTool, WatermarkTool, PageNumTool, NoteTool, SignatureTool, ImageTool, ImagePdfTool, ExtractTextTool, ExtractTableTool, SecurityTool, RedactTool, GenericTool).
- `src/components/common/`: Reusable DropZone, PdfPreview, and PartnerSpotlight components.
- `src/styles.css`: CSS styling preserving warm neutral minimalist aesthetics.
- `package.json`, `vite.config.js`: Vite build tooling.
- `run.bat`, `run.ps1`: Windows launcher scripts.
- `setup.sh`, `run.sh`: Linux/macOS launcher scripts.

## Running the app

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

### Manual
```bash
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
python -m uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/`. Run `git diff --check` before committing. For code changes, validate the affected behavior and run available checks such as `ruff check .` and relevant tests.

## Open work

- Add Typhoon OCR API integration and document its data flow.
- Add focused test suites for remaining tools.
- Improve temporary-file/error handling.
- Select and document production/deployment/licensing guidance.
