import shutil
import subprocess
import tempfile
from io import BytesIO
from pathlib import Path

import pikepdf
from PIL import Image
from pypdf import PdfReader, PdfWriter
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFError, TTFont
from reportlab.pdfgen import canvas

THAI_FONT = "/usr/share/fonts/truetype/tlwg/Loma.ttf"
FONT_FILES = {"loma": THAI_FONT, "krub": "/home/kriangkrai/.local/share/fonts/ThaiNational/TH Krub.ttf", "umpush": "/usr/share/fonts/truetype/tlwg/Umpush.ttf"}
for font_name, font_path in FONT_FILES.items():
    if Path(font_path).is_file():
        try:
            pdfmetrics.registerFont(TTFont(f"PDFLover-{font_name}", font_path))
        except (OSError, TTFError):
            continue


def merge_pdfs(files: list[bytes]) -> bytes:
    writer = PdfWriter()
    for data in files:
        reader = PdfReader(BytesIO(data))
        for page in reader.pages:
            writer.add_page(page)
    output = BytesIO()
    writer.write(output)
    return output.getvalue()


def split_pdf(data: bytes, pages: list[int]) -> bytes:
    reader = PdfReader(BytesIO(data))
    writer = PdfWriter()
    for page_number in pages:
        index = page_number - 1
        if index < 0 or index >= len(reader.pages):
            raise ValueError(f"Page {page_number} is outside the document")
        writer.add_page(reader.pages[index])
    output = BytesIO()
    writer.write(output)
    return output.getvalue()


def organize_pdf(data: bytes, order: list[int]) -> bytes:
    reader = PdfReader(BytesIO(data))
    if not order or sorted(order) != list(range(1, len(reader.pages) + 1)):
        raise ValueError("order must contain every page exactly once")
    writer = PdfWriter()
    for page_number in order:
        writer.add_page(reader.pages[page_number - 1])
    output = BytesIO()
    writer.write(output)
    return output.getvalue()


def rotate_pdf(
    data: bytes,
    degrees: int = 0,
    page_rotations: dict[str | int, int] | list[int] | None = None,
) -> bytes:
    if page_rotations is None and degrees not in {0, 90, 180, 270}:
        raise ValueError("degrees must be 90, 180, or 270")
    reader = PdfReader(BytesIO(data))
    writer = PdfWriter()
    for idx, page in enumerate(reader.pages):
        page_deg = 0
        if page_rotations is not None:
            if isinstance(page_rotations, dict):
                for k in (idx + 1, str(idx + 1), idx, str(idx)):
                    if k in page_rotations:
                        page_deg = page_rotations[k]
                        break
            elif isinstance(page_rotations, list) and idx < len(page_rotations):
                page_deg = page_rotations[idx]
        elif degrees:
            page_deg = degrees

        try:
            page_deg = int(page_deg) % 360
        except (ValueError, TypeError):
            page_deg = 0

        if page_deg % 90 != 0:
            raise ValueError("Rotation degrees must be a multiple of 90")

        if page_deg != 0:
            page.rotate(page_deg)
        writer.add_page(page)
    output = BytesIO()
    writer.write(output)
    return output.getvalue()


def crop_pdf(data: bytes, left: float, bottom: float, right: float, top: float) -> bytes:
    if min(left, bottom, right, top) < 0:
        raise ValueError("crop margins cannot be negative")
    reader = PdfReader(BytesIO(data))
    for page in reader.pages:
        box = page.mediabox
        if float(box.left) + left >= float(box.right) - right or float(box.bottom) + bottom >= float(box.top) - top:
            raise ValueError("crop margins are larger than the page")
        page.cropbox.lower_left = (float(box.left) + left, float(box.bottom) + bottom)
        page.cropbox.upper_right = (float(box.right) - right, float(box.top) - top)
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    output = BytesIO()
    writer.write(output)
    return output.getvalue()


def add_text_pdf(data: bytes, text_items: list[dict]) -> bytes:
    if not text_items:
        raise ValueError("add at least one text item")
    reader = PdfReader(BytesIO(data))
    writer = PdfWriter()
    for page in reader.pages:
        overlay = BytesIO()
        layer = canvas.Canvas(overlay, pagesize=(float(page.mediabox.width), float(page.mediabox.height)))
        page_width, page_height = float(page.mediabox.width), float(page.mediabox.height)
        for item in text_items:
            text, x, y, size = str(item.get("text", "")), float(item.get("x", 0)), float(item.get("y", 0)), float(item.get("size", 16))
            font, color = str(item.get("font", "loma")), str(item.get("color", "#222222"))
            font_name = f"PDFLover-{font}"
            if font_name not in pdfmetrics.getRegisteredFontNames():
                registered_fonts = [f for f in pdfmetrics.getRegisteredFontNames() if f.startswith("PDFLover-")]
                if registered_fonts:
                    font_name = registered_fonts[0]
                else:
                    raise ValueError("no thai font registered")
            if not color.startswith("#") or len(color) != 7:
                raise ValueError("color must be a hex value")
            try: rgb = tuple(int(color[i:i + 2], 16) / 255 for i in (1, 3, 5))
            except ValueError as exc: raise ValueError("color must be a hex value") from exc
            layer.setFont(font_name, size)
            layer.setFillColorRGB(*rgb)
            lines = text.splitlines() or [text]
            leading = size * 1.25
            for line_idx, line in enumerate(lines):
                line_y = y * page_height - (line_idx * leading)
                layer.drawString(x * page_width, line_y, line)
        layer.save()
        overlay.seek(0)
        page.merge_page(PdfReader(overlay).pages[0])
        writer.add_page(page)
    output = BytesIO(); writer.write(output); return output.getvalue()


def compress_pdf(data: bytes, quality: str = "balanced") -> bytes:
    if quality not in {"low", "balanced", "high"}:
        raise ValueError("quality must be low, balanced, or high")
    # Ghostscript can downsample raster images, which are usually the largest
    # part of scanned PDFs. Fall back to stream repacking when it is unavailable.
    if shutil.which("gs"):
        preset = {"low": "/printer", "balanced": "/ebook", "high": "/screen"}[quality]
        with tempfile.TemporaryDirectory(prefix="pdflover-") as folder:
            source = f"{folder}/source.pdf"
            target = f"{folder}/result.pdf"
            with open(source, "wb") as handle:
                handle.write(data)
            subprocess.run(
                ["gs", "-q", "-dSAFER", "-dBATCH", "-dNOPAUSE", "-sDEVICE=pdfwrite", f"-dPDFSETTINGS={preset}", f"-sOutputFile={target}", source],
                check=True,
                capture_output=True,
            )
            with open(target, "rb") as handle:
                return handle.read()
    # Repack streams and object tables. This reduces PDFs with redundant
    # streams; raster image downsampling is intentionally a later step because
    # it requires a quality target and can visibly change document output.
    pdf = pikepdf.Pdf.open(BytesIO(data))
    output = BytesIO()
    pdf.save(
        output,
        compress_streams=True,
        recompress_flate=True,
        object_stream_mode=pikepdf.ObjectStreamMode.generate,
        linearize=quality == "low",
    )
    return output.getvalue()


def add_page_numbers_pdf(
    data: bytes,
    position: str = "bottom-center",
    page_mode: str = "all",
    skip_first: bool = False,
    start_number: int = 1,
    format_style: str = "number",
    font_name: str = "loma",
    font_size: float = 11.0,
    color: str = "#444444",
    margin: float = 36.0,
) -> bytes:
    reader = PdfReader(BytesIO(data))
    writer = PdfWriter()
    total_pages = len(reader.pages)
    if total_pages == 0:
        raise ValueError("PDF document is empty")

    registered_font = f"PDFLover-{font_name}"
    if registered_font not in pdfmetrics.getRegisteredFontNames():
        available = [f for f in pdfmetrics.getRegisteredFontNames() if f.startswith("PDFLover-")]
        registered_font = available[0] if available else "Helvetica"

    hex_clean = color.lstrip("#")
    if len(hex_clean) == 6:
        rgb = tuple(int(hex_clean[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    else:
        rgb = (0.25, 0.25, 0.25)

    vert_pos, horiz_pos = ("bottom", "center")
    parts = position.split("-")
    if len(parts) == 2:
        vert_pos, horiz_pos = parts[0], parts[1]

    for idx, page in enumerate(reader.pages):
        page_num_1based = idx + 1

        if idx == 0 and skip_first:
            writer.add_page(page)
            continue

        is_odd = page_num_1based % 2 != 0
        if page_mode == "odd" and not is_odd:
            writer.add_page(page)
            continue
        if page_mode == "even" and is_odd:
            writer.add_page(page)
            continue

        current_horiz = horiz_pos
        if page_mode == "alternate":
            current_horiz = "right" if is_odd else "left"

        display_num = start_number + idx - (1 if skip_first else 0)
        display_total = total_pages - (1 if skip_first else 0)

        if format_style == "prefix":
            text = f"หน้า {display_num}"
        elif format_style == "fraction":
            text = f"{display_num} / {display_total}"
        elif format_style == "full":
            text = f"หน้า {display_num} จาก {display_total} หน้า"
        else:
            text = str(display_num)

        page_w = float(page.mediabox.width)
        page_h = float(page.mediabox.height)

        overlay = BytesIO()
        layer = canvas.Canvas(overlay, pagesize=(page_w, page_h))
        layer.setFont(registered_font, font_size)
        layer.setFillColorRGB(*rgb)

        y = margin if vert_pos == "bottom" else (page_h - margin)

        if current_horiz == "left":
            layer.drawString(margin, y, text)
        elif current_horiz == "right":
            layer.drawRightString(page_w - margin, y, text)
        else:
            layer.drawCentredString(page_w / 2.0, y, text)

        layer.save()
        overlay.seek(0)
        page.merge_page(PdfReader(overlay).pages[0])
        writer.add_page(page)

    output = BytesIO()
    writer.write(output)
    return output.getvalue()


def add_watermark_pdf(
    data: bytes,
    text: str = "",
    image_data: bytes | None = None,
    angle: float = 45.0,
    font_name: str = "loma",
    font_size: float = 48.0,
    color: str = "#888888",
    opacity: float = 0.25,
    position: str = "center",
    layer: str = "over",
    skip_first: bool = False,
    page_mode: str = "all",
) -> bytes:
    if not text and not image_data:
        raise ValueError("Watermark text or image is required")

    reader = PdfReader(BytesIO(data))
    writer = PdfWriter()
    total_pages = len(reader.pages)
    if total_pages == 0:
        raise ValueError("PDF document is empty")

    registered_font = f"PDFLover-{font_name}"
    if registered_font not in pdfmetrics.getRegisteredFontNames():
        available = [f for f in pdfmetrics.getRegisteredFontNames() if f.startswith("PDFLover-")]
        registered_font = available[0] if available else "Helvetica"

    hex_clean = color.lstrip("#")
    if len(hex_clean) == 6:
        rgb = tuple(int(hex_clean[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    else:
        rgb = (0.5, 0.5, 0.5)

    alpha = max(0.01, min(1.0, float(opacity)))

    img_reader = None
    img_w, img_h = 0.0, 0.0
    if image_data:
        try:
            pil_img = Image.open(BytesIO(image_data))
            orig_w, orig_h = pil_img.size
            aspect = orig_h / max(1, orig_w)
            img_w = min(float(orig_w), 240.0)
            img_h = img_w * aspect
            img_reader = ImageReader(BytesIO(image_data))
        except Exception as exc:
            raise ValueError(f"Invalid watermark image: {exc}") from exc

    for idx, page in enumerate(reader.pages):
        page_num = idx + 1
        if idx == 0 and skip_first:
            writer.add_page(page)
            continue

        is_odd = page_num % 2 != 0
        if page_mode == "odd" and not is_odd:
            writer.add_page(page)
            continue
        if page_mode == "even" and is_odd:
            writer.add_page(page)
            continue

        page_w = float(page.mediabox.width)
        page_h = float(page.mediabox.height)

        overlay = BytesIO()
        layer_cv = canvas.Canvas(overlay, pagesize=(page_w, page_h))
        layer_cv.setFillAlpha(alpha)
        layer_cv.setStrokeAlpha(alpha)
        layer_cv.setFillColorRGB(*rgb)
        layer_cv.setFont(registered_font, font_size)

        def draw_mark(cv: canvas.Canvas) -> None:
            if img_reader:
                cv.drawImage(
                    img_reader,
                    -img_w / 2.0,
                    -img_h / 2.0,
                    width=img_w,
                    height=img_h,
                    mask="auto",
                )
            else:
                cv.drawCentredString(0, -font_size / 3.0, text)

        if position == "tiled":
            cols, rows = 3, 3
            step_x = page_w / float(cols)
            step_y = page_h / float(rows)
            for r in range(rows):
                for c in range(cols):
                    layer_cv.saveState()
                    layer_cv.translate(step_x * (c + 0.5), step_y * (r + 0.5))
                    layer_cv.rotate(angle)
                    draw_mark(layer_cv)
                    layer_cv.restoreState()
        else:
            cx = page_w / 2.0
            if position == "top":
                cy = page_h - 90.0
            elif position == "bottom":
                cy = 90.0
            else:
                cy = page_h / 2.0

            layer_cv.saveState()
            layer_cv.translate(cx, cy)
            layer_cv.rotate(angle)
            draw_mark(layer_cv)
            layer_cv.restoreState()

        layer_cv.save()
        overlay.seek(0)
        overlay_page = PdfReader(overlay).pages[0]
        page.merge_page(overlay_page, over=(layer == "over"))
        writer.add_page(page)

    output = BytesIO()
    writer.write(output)
    return output.getvalue()
