from io import BytesIO
import shutil
import subprocess
import tempfile
import pikepdf
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

THAI_FONT = "/usr/share/fonts/truetype/tlwg/Loma.ttf"
try:
    pdfmetrics.registerFont(TTFont("PDFLoverThai", THAI_FONT))
    TEXT_FONT = "PDFLoverThai"
except OSError:
    TEXT_FONT = "Helvetica"


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


def rotate_pdf(data: bytes, degrees: int) -> bytes:
    if degrees not in {90, 180, 270}:
        raise ValueError("degrees must be 90, 180, or 270")
    reader = PdfReader(BytesIO(data))
    writer = PdfWriter()
    for page in reader.pages:
        page.rotate(degrees)
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


def add_text_pdf(data: bytes, text: str, x: float, y: float, size: float) -> bytes:
    if not text.strip() or size <= 0:
        raise ValueError("text and a positive font size are required")
    reader = PdfReader(BytesIO(data))
    writer = PdfWriter()
    for page in reader.pages:
        overlay = BytesIO()
        layer = canvas.Canvas(overlay, pagesize=(float(page.mediabox.width), float(page.mediabox.height)))
        layer.setFont(TEXT_FONT, size)
        layer.drawString(x, y, text)
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
