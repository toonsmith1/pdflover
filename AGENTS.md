# Agent instructions for PDF Lover

## Repository state

The current implementation is an MVP in `/home/kriangkrai/Documents/pdflover`.

- Backend: FastAPI in `app/`.
- Frontend: plain HTML/CSS/JavaScript in `frontend/`.
- Local PDF operations: `app/pdf_service.py`.
- Runtime dependencies: `requirements.txt`.
- Setup helper: `setup.sh`.
- Current commit: `5a5830e feat: add local-first PDF web app`.
- Remote push still requires GitHub authentication.

## Required behavior

1. Preserve one page per tool: each menu links to `/tool/<tool_name>`.
2. Keep upload separate from the settings/preview stage.
3. Every file input must support repeated selection where the tool accepts multiple files; a later selection must append, not replace, prior files.
4. Merge must show a responsive column grid of file cards, support drag reorder, file removal, add-more, and per-file preview.
5. Keep the UI responsive and lightweight. Do not introduce a heavy frontend framework or local OCR model without a clear reason.
6. OCR should call the configured Typhoon OCR API. Keep API keys server-side in `.env`.

## Before editing

Read the relevant existing file and check `git status`. Do not overwrite newer work based on old README claims. Run `git diff --check` before committing. Do not commit `.env`, `.venv`, generated PDFs, or uploaded user files.

## Validation

Run the app with:

```bash
source .venv/bin/activate
python -m uvicorn app.main:app --reload
```

Smoke-test `/`, `/tool/compress`, `/tool/split`, and `/tool/merge`. For merge, select files in separate chooser actions and verify both remain visible and can be reordered. Run `ruff check .` and relevant tests when available.

## Open tasks

Implement the remaining backend tool operations, add the Typhoon OCR adapter, strengthen temporary-file/error handling, add tests, refresh README's status section, and document production deployment/licensing choices.
