# PDF Lover project handoff for Gemini

Read `AGENTS.md` before editing. It contains shared behavior requirements and repository guidance.

## Repository state

- Project: `/home/kriangkrai/Documents/pdflover`
- Backend: FastAPI/Python in `app/`
- Frontend: plain HTML, CSS, and JavaScript in `frontend/`
- Git branch: `main`; GitHub remote: `git@github.com:toonsmith1/pdflover.git`
- At the start of this handoff, local and remote `main` matched at `faf3d6d` (`feat: lay out PDF text editor workspace`).
- The local `.env` and `.venv` are ignored and must stay out of Git.

Implemented PDF operations: merge, split, compress, rotate, organize/reorder, crop, and add text. The other catalog menus are not yet fully implemented on the backend.

## Text editor behavior

The add-text tool uses a page image rendered from the selected PDF. Users can add multiple text boxes, edit Thai text, move them with the mouse, change each item's size/font/color, and remove items. The next stage submits all non-empty items to Python, embeds them into the PDF, then displays the generated PDF for inspection and download. Do not display the original PDF viewer during placement on the image.

## Possible frontend evolution

The current vanilla JavaScript editor is becoming stateful. Vite + React could make selection, dragging, item lists, toolbar state, and editor interactions easier to maintain while Python/FastAPI continues doing PDF work. Node.js can serve as frontend build tooling; replacing the Python PDF backend is not recommended. This remains an option to discuss, not an approved migration. Do not start a rewrite without explicit direction; if approved, migrate incrementally and preserve working routes.

## Important files

- `app/main.py`: API and page routes, including `/api/render-preview` and `/api/text`.
- `app/pdf_service.py`: PDF processing and text/font embedding.
- `frontend/index.html`, `frontend/app.js`: catalog page.
- `frontend/tool.html`, `frontend/tool.js`: shared tool layout and operations.
- `frontend/upload-flow.js`: staged upload flow.
- `frontend/text-preview.js`: image text editor.
- `frontend/merge.js`, `frontend/organize.js`: specialized flows.
- `frontend/styles.css`: layout and styling.
- `requirements.txt`, `setup.sh`: installation.

Keep the Muji-inspired neutral style, one route per tool, and OCR through Typhoon's remote API. Do not add a GPU-only or large local OCR dependency.

## Run and continue

```bash
source .venv/bin/activate
python -m uvicorn app.main:app --reload
```

Before editing, inspect `git status` and the current source. Do not trust stale README claims over the implementation. Run `git diff --check` before committing. Never add `.env`, `.venv`, user PDFs, or generated output.

Next likely tasks: implement watermark/page numbering, connect remaining tool menus, integrate Typhoon OCR, add focused tests, improve error handling, and refresh README/deployment/licensing notes.
