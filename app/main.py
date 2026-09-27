import json
from io import BytesIO
from pathlib import Path
from typing import Annotated

import pypdfium2 as pdfium
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pypdf import PdfReader

from .config import get_settings
from .pdf_service import (
    add_text_pdf,
    compress_pdf,
    crop_pdf,
    merge_pdfs,
    organize_pdf,
    rotate_pdf,
    split_pdf,
)

settings = get_settings()
app = FastAPI(title="PDF Lover API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8000", "http://localhost:8000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def check_file(upload: UploadFile, data: bytes) -> None:
    limit = settings.max_upload_mb * 1024 * 1024
    if len(data) > limit:
        raise HTTPException(413, f"File is larger than {settings.max_upload_mb} MB")
    if upload.content_type not in {"application/pdf", "application/octet-stream", None}:
        raise HTTPException(415, "Only PDF files are supported")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "ocr": "configured" if settings.typhoon_ocr_api_key else "api-key-required"}


@app.post("/api/merge")
async def merge(files: Annotated[list[UploadFile], File(...)]) -> Response:
    if len(files) < 2:
        raise HTTPException(400, "Choose at least two PDF files")
    contents = []
    for upload in files:
        data = await upload.read()
        check_file(upload, data)
        contents.append(data)
    try:
        result = merge_pdfs(contents)
    except Exception as exc:
        raise HTTPException(400, f"Could not merge PDFs: {exc}") from exc
    return Response(result, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="merged.pdf"'})


def parse_page_selection(pages_str: str) -> list[int]:
    selected = []
    for chunk in pages_str.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        if "-" in chunk:
            start_str, end_str = chunk.split("-", 1)
            start, end = int(start_str.strip()), int(end_str.strip())
            step = 1 if start <= end else -1
            selected.extend(range(start, end + step, step))
        else:
            selected.append(int(chunk))
    return selected


@app.post("/api/split")
async def split(file: Annotated[UploadFile, File(...)], pages: Annotated[str, Form(...)]) -> Response:
    data = await file.read()
    check_file(file, data)
    try:
        selected = parse_page_selection(pages)
        if not selected:
            raise ValueError("No pages specified")
        result = split_pdf(data, selected)
    except (ValueError, TypeError) as exc:
        raise HTTPException(400, f"Invalid pages: {exc}") from exc
    return Response(result, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="split.pdf"'})


@app.post("/api/organize")
async def organize(file: Annotated[UploadFile, File(...)], order: Annotated[str, Form(...)]) -> Response:
    data = await file.read()
    check_file(file, data)
    try:
        selected = [int(value.strip()) for value in order.split(",") if value.strip()]
        result = organize_pdf(data, selected)
    except (ValueError, TypeError) as exc:
        raise HTTPException(400, f"Invalid page order: {exc}") from exc
    return Response(result, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="organized.pdf"'})


@app.post("/api/pdf-info")
async def pdf_info(file: Annotated[UploadFile, File(...)]) -> dict[str, int]:
    data = await file.read()
    check_file(file, data)
    try:
        return {"pages": len(PdfReader(BytesIO(data)).pages)}
    except Exception as exc:
        raise HTTPException(400, f"Could not read PDF: {exc}") from exc


@app.post("/api/rotate")
async def rotate(file: Annotated[UploadFile, File(...)], degrees: Annotated[int, Form()] = 90) -> Response:
    data = await file.read()
    check_file(file, data)
    try:
        result = rotate_pdf(data, degrees)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return Response(result, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="rotated.pdf"'})


@app.post("/api/crop")
async def crop(file: Annotated[UploadFile, File(...)], left: Annotated[float, Form()] = 0, bottom: Annotated[float, Form()] = 0, right: Annotated[float, Form()] = 0, top: Annotated[float, Form()] = 0) -> Response:
    data = await file.read()
    check_file(file, data)
    try:
        result = crop_pdf(data, left, bottom, right, top)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return Response(result, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="cropped.pdf"'})


@app.post("/api/text")
async def add_text(file: Annotated[UploadFile, File(...)], items: Annotated[str, Form(...)]) -> Response:
    data = await file.read(); check_file(file, data)
    try:
        parsed_items = json.loads(items)
        if not isinstance(parsed_items, list):
            raise TypeError("text items must be a list")
        result = add_text_pdf(data, parsed_items)
    except (ValueError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(400, str(exc)) from exc
    return Response(result, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="text-added.pdf"'})


@app.post("/api/render-preview")
async def render_preview(file: Annotated[UploadFile, File(...)]) -> Response:
    data = await file.read(); check_file(file, data)
    try:
        document = pdfium.PdfDocument(data)
        bitmap = document[0].render(scale=1.5)
        image = bitmap.to_pil()
        output = BytesIO(); image.save(output, format="PNG")
        return Response(output.getvalue(), media_type="image/png")
    except Exception as exc:
        raise HTTPException(400, f"Could not render PDF preview: {exc}") from exc


@app.post("/api/compress")
async def compress(file: Annotated[UploadFile, File(...)], quality: Annotated[str, Form()] = "balanced") -> Response:
    data = await file.read()
    check_file(file, data)
    try:
        result = compress_pdf(data, quality)
    except Exception as exc:
        raise HTTPException(400, f"Could not compress PDF: {exc}") from exc
    return Response(result, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="compressed.pdf"'})


dist_dir = Path(__file__).resolve().parent.parent / "dist"
frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
static_dir = dist_dir if (dist_dir / "index.html").exists() else frontend_dir


@app.api_route("/tool/{tool_name}", methods=["GET", "HEAD"])
def tool_page(tool_name: str) -> FileResponse:
    """Serve dedicated tool document or React SPA bundle."""
    if tool_name not in {
        "compress",
        "split",
        "merge",
        "organize",
        "rotate",
        "crop",
        "text",
        "watermark",
        "pagenum",
        "signature",
        "ocr",
        "image",
        "image-pdf",
        "extract-text",
        "extract-table",
        "protect",
        "unlock",
        "redact",
    }:
        raise HTTPException(404, "Tool not found")
    index_file = dist_dir / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return FileResponse(frontend_dir / "tool.html")


if static_dir.exists():
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
