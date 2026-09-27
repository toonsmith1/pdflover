# PDF Lover project handoff for Gemini

Read `AGENTS.md` before editing. It contains shared behavior requirements and repository guidance.

## Repository state

- Project: `/home/kriangkrai/Documents/pdflover`
- Backend: FastAPI/Python in `app/`
- Frontend: React 19 + Vite in `src/` (builds to `dist/`, served by FastAPI with fallback to `frontend/`)
- Git branch: `main`; GitHub remote: `git@github.com:toonsmith1/pdflover.git`
- The local `.env` and `.venv` are ignored and must stay out of Git.

Implemented PDF operations: merge, split, compress, rotate, organize/reorder, crop, and add text. The other catalog menus are visible in the UI and pending backend implementation.

## Text editor behavior

The add-text tool uses a page image rendered from the selected PDF (`/api/render-preview`). Users can add multiple text boxes, edit Thai/English text, move them with the mouse, change each item's size/font/color, and remove items. The next stage submits all non-empty items to Python (`/api/text` with `y: 1 - y` inversion), embeds them into the PDF, then displays the generated PDF for inspection and download. The original PDF viewer is not displayed during placement on the image.

## Frontend architecture (React + Vite)

The frontend has been migrated to React + Vite with `react-router-dom`:
- Component architecture in `src/components/` (Home catalog, tool shell, common DropZone & PdfPreview, individual tool components).
- State and drag-drop interactions are managed declaratively in React.
- Muji-inspired restrained design system in `src/styles.css`.
- Python/FastAPI continues serving all `/api/*` endpoints and serves `dist/index.html` on `/` and `/tool/<tool_name>`.

## Partner spotlight and version updates

- Home catalog uses a compact split-grid hero (60% branding & search, 40% partner card).
- Partner spotlight (`src/components/common/PartnerSpotlight.jsx`): Displays lightweight, clean recommendation cards (e.g. Shopee affiliate with product thumbnail & price, or partner tools). Cached for 24h. When offline or on fetch failure, automatically flips to "Buy Me a Coffee ☕".
- Version update notification: Checks lightweight remote manifest (e.g. GitHub raw `version.json`) daily. Non-intrusive UI (titlebar badge or dismissible banner).
- Private monetization manifests and local secret configs remain strictly git-ignored (`.gitignore`).

## Important files

- `app/main.py`: API and SPA page routes, serving `dist/` bundle.
- `app/pdf_service.py`: PDF transformations and font embedding.
- `src/App.jsx`, `src/main.jsx`: React entry point and routing.
- `src/components/ToolCatalog.jsx`: Home catalog and category filters.
- `src/components/ToolPage.jsx`: Tool layout shell.
- `src/components/tools/`: Individual tool implementations (TextTool, MergeTool, OrganizeTool, CompressTool, SplitTool, RotateTool, CropTool, GenericTool).
- `src/components/common/`: Shared DropZone and PdfPreview components.
- `src/styles.css`: Full design system and responsive layout.
- `package.json`, `vite.config.js`: Vite build configuration.

Keep the Muji-inspired neutral style, one route per tool, and OCR through Typhoon's remote API. Do not add a GPU-only or large local OCR dependency.

## Run and continue

```bash
source .venv/bin/activate
python -m uvicorn app.main:app --reload
```

Before editing, inspect `git status` and the current source. Do not trust stale README claims over the implementation. Run `git diff --check` before committing. Never add `.env`, `.venv`, user PDFs, or generated output.

Next likely tasks: implement watermark/page numbering, connect remaining tool menus, integrate Typhoon OCR, add focused tests, improve error handling, and refresh README/deployment/licensing notes.
