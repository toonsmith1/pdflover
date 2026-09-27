# PDF Lover

PDF Lover is a local-first PDF toolbox with a small Python service and a browser UI. Common PDF operations run on the user's machine; OCR is provided through a remote Typhoon OCR API so the app does not need to download a large model or require a GPU.

## Current status

The repository currently contains the Muji-style tool catalog preview in [`pdflover-preview.html`](./pdflover-preview.html). The Python service structure and dependency manifest are prepared for the next implementation phase.

## Requirements

- Python 3.11 or newer
- Ghostscript for image-aware compression (`sudo apt install ghostscript` on Debian/Ubuntu)
- Internet access during installation and when using OCR
- A Typhoon OCR API key for OCR features

PDF operations that do not use OCR can run without internet after dependencies are installed. OCR sends the selected document pages to the configured provider; do not use the OCR feature for sensitive documents unless that data flow is acceptable.

## Quick start

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env

# Build frontend (React + Vite)
npm install
npm run build
```

Run the web app:

```bash
python -m uvicorn app.main:app --reload
```

Then open <http://127.0.0.1:8000>.

During frontend development, you can also run Vite dev server with API proxying:

```bash
npm run dev
```

The current MVP has working local endpoints for compressing, splitting, merging, rotating, cropping, organizing, and adding text to PDF files. The other catalog tools are visible in the UI and will be connected incrementally.

## Development

Install development tools with:

```bash
python -m pip install -r requirements-dev.txt
ruff check .
pytest
```

The API key must remain in `.env` or in the process environment. Never put it in frontend JavaScript, commit it to Git, or paste it into an issue.

Compression uses Ghostscript when available so scanned PDFs can be reduced by downsampling embedded images. Review Ghostscript's AGPL or commercial licensing terms before distributing a closed-source hosted product.

## Planned service layout

```text
app/
  main.py          FastAPI entry point
  config.py        environment configuration
  pdf_service.py   local PDF operations
  ocr_service.py   Typhoon API adapter
  files.py         temporary-file lifecycle
```

## License

No license has been selected yet. Add a license before accepting outside contributions or distributing the project.
