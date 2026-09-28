# PDF Lover

**English** | [ภาษาไทย](README.th.md) | [日本語](README.ja.md)

---

PDF Lover is a local-first PDF toolbox with a FastAPI backend and a modern React browser UI. Common PDF operations run privately on the user's machine; OCR is designed to use a remote Typhoon OCR API so the app does not require a large local model or a GPU.

## Current status

The repository contains a React 19 + Vite frontend (built to `dist/`, served by FastAPI) and a Python backend supporting local PDF transformations.

### Implemented local features

- **Organize & Layout**: Merge, Split, Reorder / Organize, Rotate, Crop
- **Content & Annotation**: Add Text (with Thai font support), Notes, Watermark, Page Numbers, Digital Signature
- **Conversion & Extraction**: PDF to Images (ZIP), Images to PDF, Extract Text, Extract Table
- **Security & Privacy**: Protect (password encryption), Unlock, Redact (black-out sensitive areas)
- **Optimization**: Compress (with Ghostscript downsampling support when installed)

*Note: OCR integration uses the Typhoon OCR remote API (requires an API key in `.env`).*

## Requirements

- Python 3.11 or newer
- Node.js & npm (v18+) for building the React frontend
- Ghostscript (optional, for image-aware PDF compression: `sudo apt install ghostscript` on Debian/Ubuntu)
- Typhoon OCR API key (optional, only needed for remote OCR)

## Quick start

### Windows

1. Clone the repository:
   ```bash
   git clone https://github.com/toonsmith1/pdflover.git
   cd pdflover
   ```

2. Run the application:
   - Double-click `run.bat` or execute in PowerShell:
     ```powershell
     .\run.bat
     # or
     .\run.ps1
     ```
   *(The script automatically sets up `.venv`, installs Python and npm packages, builds the frontend bundle, and launches the server).*

3. Open your browser at <http://127.0.0.1:8000>.

---

### Linux / macOS

1. Setup environment (one-time):
   ```bash
   git clone https://github.com/toonsmith1/pdflover.git
   cd pdflover
   chmod +x setup.sh run.sh
   ./setup.sh
   ```

2. Start the application:
   ```bash
   ./run.sh
   ```

3. Open <http://127.0.0.1:8000>.

---

### Manual setup

```bash
# 1. Python virtual environment
python -m venv .venv

# On Linux/macOS:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env

# 2. Build React frontend
npm install
npm run build

# 3. Start server
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

During frontend development, you can run the Vite dev server with proxy support:
```bash
npm run dev
```

## Development

Install development and testing dependencies:
```bash
pip install -r requirements-dev.txt
ruff check .
pytest
```

## Project structure

```text
app/
  main.py          FastAPI routes & static SPA bundle serving
  config.py        Environment settings and configuration
  pdf_service.py   Local PDF processing engine (pypdf, pikepdf, reportlab, pypdfium2)
  ads_service.py   Partner spotlight and local campaign management
src/
  components/      React UI components (tools, catalog, dropzone, preview)
  styles.css       Muji-inspired minimalist design system
dist/              Production frontend build served by FastAPI
tests/             Automated test suites
```

## License

No license has been selected yet. Add a license before accepting outside contributions or distributing the project.
