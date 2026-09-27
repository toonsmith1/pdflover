# PDF Lover: Claude handoff context

Read `AGENTS.md` first; it contains the shared repository rules and current project state.

## Current status

PDF Lover is an active local-first PDF toolbox in `/home/kriangkrai/Documents/pdflover`. The FastAPI backend and plain HTML/CSS/JavaScript frontend are running locally. At the start of this handoff, `main` matched GitHub `origin/main` at `faf3d6d` (`feat: lay out PDF text editor workspace`). The remote is `git@github.com:toonsmith1/pdflover.git`.

Seven PDF operations currently have backend implementations: merge, split, compress, rotate, organize/reorder, crop, and add text. Other catalog entries still have placeholder behavior.

## Most recent UX work

## Non-negotiable interaction rule

Never collapse upload, editing/selection, processing, and download into one automatic action. For tools involving pages or document content, the user must see an input preview or editor, make or review their choices, explicitly start processing, and then see the generated result before downloading. Preserve this staged workflow when adding new tools; a quick endpoint implementation is incomplete if the UI skips the review stage.

The add-text tool now follows this flow:

1. Select one PDF.
2. Render a page to an image and edit text on top of that image.
3. Add multiple text items; edit their Thai text, position, font, size, and color; drag or remove items.
4. Process the PDF with all non-empty items, inspect the result PDF, then download it.

Keep the source PDF viewer hidden during image-based text placement. The generated PDF embeds the selected font and writes every text item through `/api/text`.

## Architecture guidance

Current frontend is vanilla JavaScript and backend is FastAPI/Python. A possible future improvement is Vite + React for a stateful editor frontend, while keeping Python/FastAPI responsible for PDF operations. Node.js could be limited to development/build tooling; a full Node backend is not needed. This is a recommendation to evaluate incrementally, not an approved rewrite. Preserve the working PDF endpoints and migrate one editor surface at a time if the project owner chooses this direction.

## Key files

- `app/main.py`: FastAPI routes, including PDF image render and text processing.
- `app/pdf_service.py`: PDF operations and font embedding.
- `frontend/tool.html`, `frontend/tool.js`: shared tool page.
- `frontend/upload-flow.js`: upload/settings flow.
- `frontend/text-preview.js`: image-based multi-text editor.
- `frontend/merge.js`, `frontend/organize.js`: specialized tool flows.
- `frontend/styles.css`: shared responsive styling.

## Run

```bash
source .venv/bin/activate
python -m uvicorn app.main:app --reload
```

Never commit `.env`, uploaded documents, generated PDFs, or `.venv`. Keep OCR remote through Typhoon API; do not add a large local model or GPU requirement to the default install.

## Next work

Implement more tool backends (watermark/page numbers are natural next choices), add Typhoon OCR integration, add focused tests, improve error/temp-file handling, refresh README's stale status, and document deployment/licensing.
