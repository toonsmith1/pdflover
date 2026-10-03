# PDF Lover

**English** | [ภาษาไทย](README.th.md) | [日本語](README.ja.md)

---

PDF Lover is a local-first PDF toolbox with a FastAPI backend and a modern React browser UI. Common PDF operations run privately on the user's machine; OCR is designed to use a remote Typhoon OCR API so the app does not require a large local model or a GPU.

## Current status

The repository contains a React 19 + Vite frontend (built to `dist/`, served by FastAPI) and a Python backend supporting local PDF transformations.

### Implemented local features

- **Organize & Layout**: Merge, Split, Reorder / Organize, Rotate, Crop
- **Content & Annotation**: Add Text (interactive canvas studio, pan & zoom, multi-language fonts), Notes, Watermark, Page Numbers, Digital Signature
- **Conversion & Extraction**: PDF to Images (ZIP), Images to PDF, Extract Text, Extract Table
- **Security & Privacy**: Protect (password encryption), Unlock, Redact (black-out sensitive areas)
- **Optimization**: Compress (with Ghostscript downsampling support when installed)
- **Localization (i18n)**: Full interface translation for English (🇬🇧), Thai (🇹🇭), and Japanese (🇯🇵) with instant switching.

### Typography & Multi-language Fonts

- **Thai (ภาษาไทย)**: Bundled `TH Sarabun New` and Google Fonts `Sarabun` choices with PyThaiNLP vowel and tone mark shaping. Their license notices are included under [fonts/](fonts/).
- **Japanese (日本語)**: Bundled `Noto Sans JP` is used for consistent Japanese PDF output. It is distributed under SIL OFL 1.1; see [fonts/README.md](fonts/README.md).
- **Third-party licenses**: Redistribution notices for bundled fonts and ReportLab are kept in [fonts/](fonts/) and [licenses/](licenses/).
- **Tool UX guidance**: The staged full-workspace interaction model is documented for future contributors and coding agents in [docs/AI_TOOL_UX_GUIDE.md](docs/AI_TOOL_UX_GUIDE.md).
- **English & Western**: Universal standard PDF fonts (`Helvetica`, `Times-Roman`, `Courier`).

### Word to PDF status

The Word to PDF workflow currently parses DOCX XML into shared HTML/CSS for the browser preview and PDF output. Basic text, styles, tables, Thai fonts, and section margins are supported, but page-boundary matching is still imperfect. Images, floating elements, and Word text boxes are not fully preserved yet.

*Note: OCR integration uses the Typhoon OCR remote API (requires an API key in `.env`).*

## Requirements

- Python 3.11 or newer
- Node.js & npm (v18+) *(Only required for building the frontend from source; Release packages include pre-built `dist/` and do not need Node.js)*
- Ghostscript (optional, for image-aware PDF compression: `sudo apt install ghostscript` on Debian/Ubuntu)
- Typhoon OCR API key (optional, only needed for remote OCR)

## Network Transparency & Privacy

PDF Lover is designed as a **local-first** application:

- **100% Local Processing**: All PDF manipulation, conversions, splitting, merging, annotations, and password encryption run locally in your browser and local Python process. Your document files are **never** uploaded to external servers.
- **External Network Requests**:
  - **Version Checks & Partner Spotlight**: The app periodically checks a lightweight JSON manifest (< 1 KB) from GitHub raw and fetches card thumbnails from Unsplash/partner CDNs to show updates and partner recommendations. All responses are cached for 24 hours and will silently fallback to offline mode ("Buy Me a Coffee ☕") when disconnected.
  - **Typhoon OCR (Optional)**: If and only if you provide a `TYPHOON_OCR_API_KEY` in `.env` and explicitly invoke the OCR tool, page images are transmitted securely to the SCB 10X Typhoon OCR API for text extraction.
- **CSRF & Localhost Protection**: The local API restricts CORS and enforces strict Origin/Referer verification alongside `TrustedHostMiddleware` to prevent malicious third-party websites from making cross-origin requests to your local `127.0.0.1:8000` instance.

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
  styles.css       Clean & minimalist design system with warm neutral tones
dist/              Production frontend build served by FastAPI
tests/             Automated test suites
```

## License

PDF Lover is distributed under the [PDF Lover Source-Available License](LICENSE).
The Partner Spotlight and partner recommendation features are required parts of
the software and may not be removed, disabled, hidden, or bypassed. Commercial
distribution, hosting, and redistribution require prior written permission.
