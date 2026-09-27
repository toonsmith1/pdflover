from io import BytesIO
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pypdf import PdfReader

from .config import get_settings
from .pdf_service import add_text_pdf, compress_pdf, crop_pdf, merge_pdfs, organize_pdf, rotate_pdf, split_pdf

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


@app.post("/api/split")
async def split(file: Annotated[UploadFile, File(...)], pages: Annotated[str, Form(...)]) -> Response:
    data = await file.read()
    check_file(file, data)
    try:
        selected = [int(value.strip()) for value in pages.split(",") if value.strip()]
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
async def add_text(file: Annotated[UploadFile, File(...)], text: Annotated[str, Form(...)], x: Annotated[float, Form()] = 72, y: Annotated[float, Form()] = 72, size: Annotated[float, Form()] = 16) -> Response:
    data = await file.read(); check_file(file, data)
    try:
        result = add_text_pdf(data, text, x, y, size)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return Response(result, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="text-added.pdf"'})


@app.post("/api/compress")
async def compress(file: Annotated[UploadFile, File(...)], quality: Annotated[str, Form()] = "balanced") -> Response:
    data = await file.read()
    check_file(file, data)
    try:
        result = compress_pdf(data, quality)
    except Exception as exc:
        raise HTTPException(400, f"Could not compress PDF: {exc}") from exc
    return Response(result, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="compressed.pdf"'})


frontend = Path(__file__).resolve().parent.parent / "frontend"


@app.get("/tool/{tool_name}")
def tool_page(tool_name: str) -> FileResponse:
    """Serve a dedicated tool document, separate from the home catalog."""
    if tool_name not in {"compress", "split", "merge", "organize", "rotate", "crop", "text", "watermark", "pagenum", "signature", "ocr", "image", "image-pdf", "extract-text", "extract-table", "protect", "unlock", "redact"}:
        raise HTTPException(404, "Tool not found")
    return FileResponse(frontend / "tool.html")


if frontend.exists():
    app.mount("/", StaticFiles(directory=frontend, html=True), name="frontend")
