import base64
import json
import subprocess
import platform
import shutil
import zipfile
from io import BytesIO
from pathlib import Path
from typing import Annotated, Any
from urllib.parse import urlparse

import httpx
import pdfplumber
import pypdfium2 as pdfium
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageDraw
from pypdf import PdfReader
from pythainlp.util import normalize
from starlette.requests import Request
from starlette.responses import JSONResponse

from .ads_service import (
    delete_campaign,
    list_campaigns,
    save_campaign,
    token_matches,
)
from .config import get_settings
from .pdf_service import (
    add_notes_pdf,
    add_page_numbers_pdf,
    add_signatures_pdf,
    add_text_pdf,
    add_watermark_pdf,
    compress_pdf,
    crop_pdf,
    delete_pages_pdf,
    insert_blank_pages_pdf,
    insert_pdf_pages,
    merge_pdfs,
    organize_pdf,
    protect_pdf,
    rotate_pdf,
    split_pdf,
    unlock_pdf,
    word_to_pdf,
)

settings = get_settings()
app = FastAPI(title="PDF Lover API", version="0.1.0")

ALLOWED_HOSTS = {"127.0.0.1", "localhost", "::1", "testserver"}
ALLOWED_ORIGINS = {
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://testserver",
}


def _is_allowed_local_url(value: str, *, origin_only: bool = False) -> bool:
    """Accept only explicitly allowed local origins, including their expected ports."""
    try:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            return False
        normalized = f"{parsed.scheme}://{parsed.netloc}".lower().rstrip("/")
        if origin_only and (parsed.path or parsed.params or parsed.query or parsed.fragment):
            return False
        if not origin_only and (parsed.username or parsed.password):
            return False
        return normalized in ALLOWED_ORIGINS
    except (ValueError, TypeError):
        return False

@app.middleware("http")
async def verify_csrf_origin(request: Request, call_next):
    """
    Protect local server against cross-site request forgery (CSRF) from malicious websites.
    Rejects any state-changing HTTP request that originates from external domains.
    """
    if request.method in {"POST", "PUT", "DELETE", "PATCH"}:
        origin = request.headers.get("origin")
        referer = request.headers.get("referer")

        if origin and referer:
            if not _is_allowed_local_url(origin, origin_only=True) or not _is_allowed_local_url(referer):
                return JSONResponse({"detail": "Forbidden: Cross-site request rejected"}, status_code=403)
        elif origin:
            if not _is_allowed_local_url(origin, origin_only=True):
                return JSONResponse({"detail": "Forbidden: Cross-site request rejected"}, status_code=403)
        elif referer:
            if not _is_allowed_local_url(referer):
                return JSONResponse({"detail": "Forbidden: Cross-site request rejected"}, status_code=403)
        else:
            # Starlette's in-process TestClient uses this synthetic host and
            # omits browser origin headers. Never allow it over a real socket.
            if request.url.hostname != "testserver":
                return JSONResponse({"detail": "Forbidden: Missing Origin or Referer header"}, status_code=403)

    return await call_next(request)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["127.0.0.1", "localhost", "::1", "testserver"],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


def check_file(upload: UploadFile, data: bytes) -> None:
    limit = settings.max_upload_mb * 1024 * 1024
    if len(data) > limit:
        raise HTTPException(413, f"File is larger than {settings.max_upload_mb} MB")
    if upload.content_type not in {"application/pdf", "application/octet-stream", None}:
        raise HTTPException(415, "Only PDF files are supported")


def check_word_file(upload: UploadFile, data: bytes) -> None:
    limit = settings.max_upload_mb * 1024 * 1024
    if len(data) > limit:
        raise HTTPException(413, f"File is larger than {settings.max_upload_mb} MB")
    if Path(upload.filename or "").suffix.lower() not in {".doc", ".docx"}:
        raise HTTPException(415, "Only DOC and DOCX files are supported")


async def convert_word_upload(file: UploadFile) -> Response:
    data = await file.read()
    check_word_file(file, data)
    try:
        result = word_to_pdf(data, file.filename or "document.docx")
    except (RuntimeError, ValueError, OSError, subprocess.TimeoutExpired, zipfile.BadZipFile) as exc:
        raise HTTPException(400, f"Could not convert Word document: {exc}") from exc
    return Response(result, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="converted.pdf"'})


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "ocr": "configured" if settings.typhoon_ocr_api_key else "api-key-required"}


@app.get("/api/dependencies/ghostscript")
def ghostscript_status() -> dict[str, str | bool]:
    """Report optional Ghostscript availability without attempting installation."""
    executable = shutil.which("gs") or shutil.which("gswin64c") or shutil.which("gswin32c")
    return {
        "installed": bool(executable),
        "executable": executable or "",
        "platform": platform.system().lower(),
    }


@app.get("/api/dependencies/weasyprint")
def weasyprint_status() -> dict[str, str | bool]:
    """Check the Python package and native rendering libraries together."""
    try:
        from weasyprint import HTML
        HTML(string="<p>PDF Lover</p>").write_pdf()
    except Exception as exc:
        return {"installed": False, "error": str(exc), "platform": platform.system().lower()}
    return {"installed": True, "error": "", "platform": platform.system().lower()}


@app.post("/api/word-preview")
async def word_preview(file: Annotated[UploadFile, File(...)]) -> Response:
    return await convert_word_upload(file)


@app.post("/api/word-to-pdf")
async def word_to_pdf_endpoint(file: Annotated[UploadFile, File(...)]) -> Response:
    return await convert_word_upload(file)


@app.get("/api/ads")
async def public_ads() -> dict[str, Any]:
    """Return enabled campaigns from the versioned Git feed, with local fallback."""
    campaigns = []
    if settings.ads_feed_url:
        try:
            async with httpx.AsyncClient(timeout=4) as client:
                response = await client.get(settings.ads_feed_url)
                response.raise_for_status()
                remote = response.json()
                campaigns = remote if isinstance(remote, list) else remote.get("campaigns", [])
        except (httpx.HTTPError, ValueError):
            campaigns = []
    if not campaigns:
        campaigns = list_campaigns()
    else:
        # Keep locally packaged media as a fallback while GitHub's raw CDN
        # propagates a campaign update.
        local_by_id = {item.get("id"): item for item in list_campaigns()}
        campaigns = [
            {
                **local_by_id.get(item.get("id"), {}),
                **{key: value for key, value in item.items() if value not in (None, "")},
            }
            for item in campaigns
        ]
    campaigns = [item for item in campaigns if item.get("enabled", False)]
    return {"campaigns": campaigns}


def require_ads_admin(token: str | None) -> None:
    if not token_matches(token, settings.ads_admin_token):
        raise HTTPException(401, "Ads admin authentication required")


@app.get("/api/admin/ads")
def admin_ads(x_ads_admin_token: Annotated[str | None, Header()] = None) -> dict[str, Any]:
    require_ads_admin(x_ads_admin_token)
    return {"campaigns": list_campaigns()}


@app.put("/api/admin/ads/{campaign_id}")
async def admin_save_ad(campaign_id: str, payload: dict[str, Any], x_ads_admin_token: Annotated[str | None, Header()] = None) -> dict[str, Any]:
    require_ads_admin(x_ads_admin_token)
    try:
        return save_campaign(campaign_id, payload)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.delete("/api/admin/ads/{campaign_id}")
def admin_delete_ad(campaign_id: str, x_ads_admin_token: Annotated[str | None, Header()] = None) -> dict[str, bool]:
    require_ads_admin(x_ads_admin_token)
    try:
        deleted = delete_campaign(campaign_id)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    if not deleted:
        raise HTTPException(404, "Campaign not found")
    return {"deleted": True}


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


@app.post("/api/delete-pages")
async def delete_pages(file: Annotated[UploadFile, File(...)], pages: Annotated[str, Form(...)]) -> Response:
    data = await file.read()
    check_file(file, data)
    try:
        selected = parse_page_selection(pages)
        result = delete_pages_pdf(data, selected)
    except (ValueError, TypeError) as exc:
        raise HTTPException(400, f"Invalid pages: {exc}") from exc
    return Response(result, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="pages-deleted.pdf"'})


@app.post("/api/insert-pages")
async def insert_pages(file: Annotated[UploadFile, File(...)], count: Annotated[int, Form(...)], position: Annotated[int, Form(...)], source_file: Annotated[UploadFile | None, File()] = None, pages: Annotated[str | None, Form()] = None) -> Response:
    data = await file.read()
    check_file(file, data)
    try:
        if source_file is not None:
            source_data = await source_file.read()
            check_file(source_file, source_data)
            selected = parse_page_selection(pages or "")
            result = insert_pdf_pages(data, source_data, selected, position)
        else:
            result = insert_blank_pages_pdf(data, count, position)
    except (ValueError, TypeError) as exc:
        raise HTTPException(400, f"Invalid insertion settings: {exc}") from exc
    return Response(result, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="pages-inserted.pdf"'})


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
async def pdf_info(file: Annotated[UploadFile, File(...)]) -> dict[str, Any]:
    data = await file.read()
    check_file(file, data)
    try:
        reader = PdfReader(BytesIO(data))
        page = reader.pages[0]
        box = page.mediabox
        return {
            "pages": len(reader.pages),
            "width": round(float(box.width), 2),
            "height": round(float(box.height), 2),
        }
    except Exception as exc:
        raise HTTPException(400, f"Could not read PDF: {exc}") from exc


@app.post("/api/pdf-thumbnails")
async def pdf_thumbnails(file: Annotated[UploadFile, File(...)], max_pages: int = 100) -> dict[str, Any]:
    data = await file.read()
    check_file(file, data)
    try:
        document = pdfium.PdfDocument(data)
        total_pages = len(document)
        limit = min(total_pages, max(1, max_pages))
        thumbnails = []
        for i in range(limit):
            # Render a readable working preview; the UI may display thumbnails
            # larger than their grid cell when selecting/redacting content.
            bitmap = document[i].render(scale=1.0)
            image = bitmap.to_pil()
            output = BytesIO()
            image.save(output, format="JPEG", quality=90, optimize=True)
            b64 = base64.b64encode(output.getvalue()).decode("ascii")
            thumbnails.append(f"data:image/jpeg;base64,{b64}")
        return {
            "pages": total_pages,
            "thumbnails": thumbnails,
        }
    except Exception as exc:
        raise HTTPException(400, f"Could not generate thumbnails: {exc}") from exc


@app.post("/api/pdf-to-images")
async def pdf_to_images(file: Annotated[UploadFile, File(...)], pages: Annotated[str | None, Form()] = None) -> Response:
    data = await file.read()
    check_file(file, data)
    try:
        document = pdfium.PdfDocument(data)
        selected = parse_page_selection(pages) if pages else list(range(1, len(document) + 1))
        if not selected:
            raise ValueError("No pages specified")
        output = BytesIO()
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
            for page_number in selected:
                if page_number < 1 or page_number > len(document):
                    raise ValueError(f"Page {page_number} is outside the document")
                image = document[page_number - 1].render(scale=2).to_pil()
                image_buffer = BytesIO(); image.save(image_buffer, format="PNG")
                archive.writestr(f"page-{page_number:04d}.png", image_buffer.getvalue())
        return Response(output.getvalue(), media_type="application/zip", headers={"Content-Disposition": 'attachment; filename="pdf-images.zip"'})
    except Exception as exc:
        raise HTTPException(400, f"Could not convert PDF to images: {exc}") from exc


@app.post("/api/images-to-pdf")
async def images_to_pdf(files: Annotated[list[UploadFile], File(...)]) -> Response:
    if not files:
        raise HTTPException(400, "Choose at least one image")
    try:
        images = []
        for upload in files:
            data = await upload.read()
            if upload.content_type not in {"image/png", "image/jpeg", "image/webp", "image/jpg", "application/octet-stream", None}:
                raise ValueError("Only PNG, JPEG, and WebP images are supported")
            image = Image.open(BytesIO(data)).convert("RGB")
            images.append(image)
        output = BytesIO(); images[0].save(output, format="PDF", save_all=True, append_images=images[1:])
        return Response(output.getvalue(), media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="images.pdf"'})
    except Exception as exc:
        raise HTTPException(400, f"Could not create PDF from images: {exc}") from exc


@app.post("/api/extract-text")
async def extract_text(file: Annotated[UploadFile, File(...)]) -> Response:
    data = await file.read(); check_file(file, data)
    try:
        reader = PdfReader(BytesIO(data)); pages = []
        for index, page in enumerate(reader.pages, 1):
            text = normalize(page.extract_text() or "").strip()
            pages.append(f"--- หน้า {index} ---\n{text}")
        content = "\n\n".join(pages).encode("utf-8")
        return Response(content, media_type="text/plain; charset=utf-8", headers={"Content-Disposition": 'attachment; filename="extracted-text.txt"'})
    except Exception as exc:
        raise HTTPException(400, f"Could not extract text: {exc}") from exc


@app.post("/api/protect")
async def protect(file: Annotated[UploadFile, File(...)], password: Annotated[str, Form(...)]) -> Response:
    data = await file.read(); check_file(file, data)
    try:
        result = protect_pdf(data, password)
    except Exception as exc:
        raise HTTPException(400, f"Could not protect PDF: {exc}") from exc
    return Response(result, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="protected.pdf"'})


@app.post("/api/unlock")
async def unlock(file: Annotated[UploadFile, File(...)], password: Annotated[str, Form(...)]) -> Response:
    data = await file.read(); check_file(file, data)
    try:
        result = unlock_pdf(data, password)
    except Exception as exc:
        raise HTTPException(400, f"Could not unlock PDF: {exc}") from exc
    return Response(result, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="unlocked.pdf"'})


@app.post("/api/redact")
async def redact(file: Annotated[UploadFile, File(...)], regions: Annotated[str, Form(...)]) -> Response:
    data = await file.read(); check_file(file, data)
    try:
        parsed = json.loads(regions)
        if not isinstance(parsed, list):
            raise TypeError("regions must be a list")
        document = pdfium.PdfDocument(data); pages = []
        for index in range(len(document)):
            image = document[index].render(scale=2).to_pil().convert("RGB")
            draw = ImageDraw.Draw(image)
            for item in parsed:
                if int(item.get("page", 0)) != index + 1:
                    continue
                x, y, width, height = [float(item.get(key, 0)) for key in ("x", "y", "width", "height")]
                left, top = int(x * image.width), int(y * image.height)
                right, bottom = int((x + width) * image.width), int((y + height) * image.height)
                draw.rectangle((left, top, right, bottom), fill=(0, 0, 0))
            pages.append(image)
        output = BytesIO(); pages[0].save(output, format="PDF", save_all=True, append_images=pages[1:])
        return Response(output.getvalue(), media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="redacted.pdf"'})
    except Exception as exc:
        raise HTTPException(400, f"Could not redact PDF: {exc}") from exc


@app.post("/api/extract-table")
async def extract_table(file: Annotated[UploadFile, File(...)], pages: Annotated[str | None, Form()] = None) -> dict[str, Any]:
    """Extract the first usable table from each selected PDF page for review in the UI."""
    data = await file.read(); check_file(file, data)
    try:
        selected = parse_page_selection(pages) if pages else None
        tables: list[dict[str, Any]] = []
        with pdfplumber.open(BytesIO(data)) as pdf:
            page_numbers = selected or list(range(1, len(pdf.pages) + 1))
            for page_number in page_numbers:
                if page_number < 1 or page_number > len(pdf.pages):
                    raise ValueError(f"Page {page_number} is outside the document")
                page = pdf.pages[page_number - 1]
                found = page.extract_tables()
                for table_index, rows in enumerate(found, 1):
                    cleaned = [[(cell or "").strip() for cell in row] for row in rows]
                    cleaned = [row for row in cleaned if any(cell for cell in row)]
                    if cleaned:
                        width = max(len(row) for row in cleaned)
                        normalized = [row + [""] * (width - len(row)) for row in cleaned]
                        tables.append({"page": page_number, "table": table_index, "rows": normalized})
        return {"tables": tables, "count": len(tables)}
    except Exception as exc:
        raise HTTPException(400, f"Could not extract tables: {exc}") from exc


@app.post("/api/rotate")
async def rotate(
    file: Annotated[UploadFile, File(...)],
    degrees: Annotated[int, Form()] = 0,
    rotations: Annotated[str | None, Form()] = None,
) -> Response:
    data = await file.read()
    check_file(file, data)
    try:
        parsed_rotations = None
        if rotations:
            try:
                parsed_rotations = json.loads(rotations)
            except json.JSONDecodeError:
                pass
        result = rotate_pdf(data, degrees=degrees, page_rotations=parsed_rotations)
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


@app.post("/api/pagenum")
async def pagenum(
    file: Annotated[UploadFile, File(...)],
    position: Annotated[str, Form()] = "bottom-center",
    page_mode: Annotated[str, Form()] = "all",
    skip_first: Annotated[bool, Form()] = False,
    start_number: Annotated[int, Form()] = 1,
    format_style: Annotated[str, Form()] = "number",
    font_size: Annotated[float, Form()] = 11.0,
    font_name: Annotated[str, Form()] = "loma",
    color: Annotated[str, Form()] = "#444444",
) -> Response:
    data = await file.read()
    check_file(file, data)
    try:
        result = add_page_numbers_pdf(
            data,
            position=position,
            page_mode=page_mode,
            skip_first=skip_first,
            start_number=start_number,
            format_style=format_style,
            font_size=font_size,
            font_name=font_name,
            color=color,
        )
    except Exception as exc:
        raise HTTPException(400, f"Could not add page numbers: {exc}") from exc
    return Response(result, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="numbered.pdf"'})


@app.post("/api/watermark")
async def watermark(
    file: Annotated[UploadFile, File(...)],
    text: Annotated[str, Form()] = "",
    image: Annotated[UploadFile | None, File()] = None,
    angle: Annotated[float, Form()] = 45.0,
    font_name: Annotated[str, Form()] = "loma",
    font_size: Annotated[float, Form()] = 48.0,
    color: Annotated[str, Form()] = "#888888",
    opacity: Annotated[float, Form()] = 0.25,
    position: Annotated[str, Form()] = "center",
    layer: Annotated[str, Form()] = "over",
    skip_first: Annotated[bool, Form()] = False,
    page_mode: Annotated[str, Form()] = "all",
) -> Response:
    data = await file.read()
    check_file(file, data)
    image_data = None
    if image and image.filename:
        image_data = await image.read()
    try:
        result = add_watermark_pdf(
            data,
            text=text,
            image_data=image_data,
            angle=angle,
            font_name=font_name,
            font_size=font_size,
            color=color,
            opacity=opacity,
            position=position,
            layer=layer,
            skip_first=skip_first,
            page_mode=page_mode,
        )
    except Exception as exc:
        raise HTTPException(400, f"Could not add watermark: {exc}") from exc
    return Response(result, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="watermarked.pdf"'})


@app.post("/api/render-preview")
async def render_preview(file: Annotated[UploadFile, File(...)], page: int = 1) -> Response:
    data = await file.read(); check_file(file, data)
    try:
        document = pdfium.PdfDocument(data)
        page_idx = max(0, min(len(document) - 1, page - 1))
        bitmap = document[page_idx].render(scale=1.5)
        image = bitmap.to_pil()
        output = BytesIO(); image.save(output, format="PNG")
        return Response(output.getvalue(), media_type="image/png")
    except Exception as exc:
        raise HTTPException(400, f"Could not render PDF preview: {exc}") from exc


@app.post("/api/note")
async def add_notes(
    file: Annotated[UploadFile, File(...)],
    overlays: Annotated[str, Form(...)],
) -> Response:
    data = await file.read()
    check_file(file, data)
    try:
        parsed_overlays = json.loads(overlays)
        if not isinstance(parsed_overlays, dict):
            raise TypeError("overlays must be a json object")
        result = add_notes_pdf(data, parsed_overlays)
    except (ValueError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(400, str(exc)) from exc
    return Response(result, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="annotated.pdf"'})


@app.post("/api/signature")
async def sign_document(
    file: Annotated[UploadFile, File(...)],
    signatures: Annotated[str, Form(...)],
) -> Response:
    data = await file.read()
    check_file(file, data)
    try:
        parsed_sigs = json.loads(signatures)
        if not isinstance(parsed_sigs, list):
            raise TypeError("signatures must be a json list of objects")
        result = add_signatures_pdf(data, parsed_sigs)
    except (ValueError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(400, str(exc)) from exc
    return Response(result, media_type="application/pdf", headers={"Content-Disposition": 'attachment; filename="signed.pdf"'})



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
fonts_dir = Path(__file__).resolve().parent.parent / "fonts"


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
        "note",
        "watermark",
        "pagenum",
        "signature",
        "ocr",
        "image",
        "image-pdf",
        "word-to-pdf",
        "extract-text",
        "extract-table",
        "protect",
        "unlock",
        "redact",
        "delete-pages",
        "insert-page",
        "add-image",
        "highlight",
        "remove-metadata",
    }:
        raise HTTPException(404, "Tool not found")
    index_file = dist_dir / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return FileResponse(frontend_dir / "tool.html")


if fonts_dir.exists():
    app.mount("/fonts", StaticFiles(directory=fonts_dir), name="fonts")

if static_dir.exists():
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
