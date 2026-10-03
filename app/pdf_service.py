import base64
import html
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from io import BytesIO
from pathlib import Path

import pikepdf
from PIL import Image
from pypdf import PdfReader, PdfWriter
from pythainlp.util import reorder_vowels
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfbase.ttfonts import TTFError, TTFont
from reportlab.pdfgen import canvas

BASE_DIR = Path(__file__).resolve().parent.parent
FONTS_DIR = BASE_DIR / "fonts"

# Japanese Adobe CID Fonts (Standard CJK fonts built into PDF specification - 0 bytes in repo)
JAPANESE_CID_FONTS = {
    "heisei-kaku-go": "HeiseiKakuGo-W5",
    "heisei-min": "HeiseiMin-W3",
}

for _cid_key, _cid_name in JAPANESE_CID_FONTS.items():
    try:
        pdfmetrics.registerFont(UnicodeCIDFont(_cid_name))
    except Exception:
        pass

# Font paths: bundled fonts take precedence, followed by OS system font locations
FONT_FILES = {
    "th-sarabun-new": str(FONTS_DIR / "THSarabunNew.ttf"),
    "th-sarabun-new-bold": str(FONTS_DIR / "THSarabunNew Bold.ttf"),
    "th-sarabun-new-italic": str(FONTS_DIR / "THSarabunNew Italic.ttf"),
    "th-sarabun-new-bolditalic": str(FONTS_DIR / "THSarabunNew BoldItalic.ttf"),
    "th-sarabun-psk": str(FONTS_DIR / "THSarabunNew.ttf"),
    "sarabun": str(FONTS_DIR / "THSarabunNew.ttf"),
    "loma": "/usr/share/fonts/truetype/tlwg/Loma.ttf",
    "umpush": "/usr/share/fonts/truetype/tlwg/Umpush.ttf",
    "krub": "/usr/share/fonts/truetype/tlwg/Kinnari.ttf",
}

DEFAULT_THAI_FONT_NAME = None

for font_name, font_path in FONT_FILES.items():
    if Path(font_path).is_file():
        try:
            reg_name = f"PDFLover-{font_name}"
            pdfmetrics.registerFont(TTFont(reg_name, font_path, shapable=True))
            if DEFAULT_THAI_FONT_NAME is None and "sarabun" in font_name:
                DEFAULT_THAI_FONT_NAME = reg_name
        except (OSError, TTFError):
            continue

# Fallback default if Sarabun was somehow not loaded
if DEFAULT_THAI_FONT_NAME is None:
    available = [f for f in pdfmetrics.getRegisteredFontNames() if f.startswith("PDFLover-")]
    if available:
        DEFAULT_THAI_FONT_NAME = available[0]


def shape_thai(text: str) -> str:
    """
    Normalizes Thai text ordering and applies WTT 2.0 / Thai PUA glyph shaping
    for ReportLab canvas rendering, avoiding floating tone marks, missing tone marks,
    and overlapping descenders (e.g. ญ/ฐ with below vowels).
    """
    if not text:
        return text

    # 1. Correct common typing order errors (e.g. ท่ี -> ที่, ญ่ี -> ญี่)
    try:
        reordered = reorder_vowels(text)
        text = reordered
    except (ValueError, TypeError, IndexError):
        reordered = None

    UPPER_STEM = {'\u0e1b', '\u0e1d', '\u0e1f', '\u0e2c'}  # ป ฝ ฟ ฬ
    LOWER_STEM = {'\u0e0e', '\u0e0f'}                      # ฎ ฏ
    DESCENDER = {'\u0e0d', '\u0e10'}                       # ญ ฐ

    ABOVE_VOWEL = {'\u0e31', '\u0e34', '\u0e35', '\u0e36', '\u0e37', '\u0e4d', '\u0e47'}
    BELOW_VOWEL = {'\u0e38', '\u0e39', '\u0e3a'}
    TONE_MARKS = {'\u0e48', '\u0e49', '\u0e4a', '\u0e4b', '\u0e4c'}

    chars = list(text)

    # 2. Decompose sara am with tone mark: char + tone + sara am -> nikhahit + tone + sara aa
    normalized = []
    i = 0
    while i < len(chars):
        c = chars[i]
        if c in TONE_MARKS and i + 1 < len(chars) and chars[i + 1] == '\u0e33':
            normalized.append('\u0e4d')
            normalized.append(c)
            normalized.append('\u0e32')
            i += 2
        elif c == '\u0e33':
            normalized.append('\u0e4d')
            normalized.append('\u0e32')
            i += 1
        else:
            normalized.append(c)
            i += 1

    chars = normalized
    res = []
    n = len(chars)
    i = 0
    while i < n:
        c = chars[i]

        # Descenders (ญ, ฐ) before below vowel -> cut descender tail
        if c in DESCENDER and i + 1 < n and chars[i + 1] in BELOW_VOWEL:
            res.append('\uf70f' if c == '\u0e0d' else '\uf700')
            i += 1
            continue

        # Lower stem (ฎ, ฏ) before below vowel -> shift below vowel downwards
        if c in LOWER_STEM and i + 1 < n and chars[i + 1] in BELOW_VOWEL:
            res.append(c)
            bv = chars[i + 1]
            shift_bv = {'\u0e38': '\uf718', '\u0e39': '\uf719', '\u0e3a': '\uf71a'}
            res.append(shift_bv.get(bv, bv))
            i += 2
            continue

        # Upper stem consonants (ป, ฝ, ฟ, ฬ) -> shift marks left
        if c in UPPER_STEM:
            res.append(c)
            i += 1
            if i < n:
                next_c = chars[i]
                if next_c in ABOVE_VOWEL:
                    shift_av = {
                        '\u0e34': '\uf701', '\u0e35': '\uf702', '\u0e36': '\uf703', '\u0e37': '\uf704',
                        '\u0e31': '\uf710', '\u0e4d': '\uf711', '\u0e47': '\uf712'
                    }
                    res.append(shift_av.get(next_c, next_c))
                    i += 1
                    if i < n and chars[i] in TONE_MARKS:
                        shift_tone_3 = {
                            '\u0e48': '\uf713', '\u0e49': '\uf714', '\u0e4a': '\uf715',
                            '\u0e4b': '\uf716', '\u0e4c': '\uf717'
                        }
                        res.append(shift_tone_3.get(chars[i], chars[i]))
                        i += 1
                    continue
                elif next_c in BELOW_VOWEL:
                    res.append(next_c)
                    i += 1
                    if i < n and chars[i] in TONE_MARKS:
                        shift_tone_2 = {
                            '\u0e48': '\uf705', '\u0e49': '\uf706', '\u0e4a': '\uf707',
                            '\u0e4b': '\uf708', '\u0e4c': '\uf709'
                        }
                        res.append(shift_tone_2.get(chars[i], chars[i]))
                        i += 1
                    continue
                elif next_c in TONE_MARKS:
                    shift_tone_2 = {
                        '\u0e48': '\uf705', '\u0e49': '\uf706', '\u0e4a': '\uf707',
                        '\u0e4b': '\uf708', '\u0e4c': '\uf709'
                    }
                    res.append(shift_tone_2.get(next_c, next_c))
                    i += 1
                    continue
            continue

        # Normal consonant: tone mark without above vowel -> lower tone mark (avoid floating tone)
        if c in TONE_MARKS:
            prev_is_av = (i > 0 and chars[i - 1] in ABOVE_VOWEL)
            if not prev_is_av:
                shift_tone_low = {
                    '\u0e48': '\uf70a', '\u0e49': '\uf70b', '\u0e4a': '\uf70c',
                    '\u0e4b': '\uf70d', '\u0e4c': '\uf70e'
                }
                res.append(shift_tone_low.get(c, c))
                i += 1
                continue

        res.append(c)
        i += 1

    return "".join(res)


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


def delete_pages_pdf(data: bytes, pages: list[int]) -> bytes:
    reader = PdfReader(BytesIO(data))
    if not pages:
        raise ValueError("at least one page is required")
    indexes = {page - 1 for page in pages}
    if any(index < 0 or index >= len(reader.pages) for index in indexes):
        raise ValueError("a page is outside the document")
    if len(indexes) >= len(reader.pages):
        raise ValueError("at least one page must remain")
    writer = PdfWriter()
    for index, page in enumerate(reader.pages):
        if index not in indexes:
            writer.add_page(page)
    output = BytesIO()
    writer.write(output)
    return output.getvalue()


def insert_blank_pages_pdf(data: bytes, count: int, position: int) -> bytes:
    reader = PdfReader(BytesIO(data))
    if count < 1:
        raise ValueError("at least one blank page is required")
    if position < 1 or position > len(reader.pages) + 1:
        raise ValueError("position is outside the document")
    writer = PdfWriter()
    for index, page in enumerate(reader.pages, start=1):
        if index == position:
            for _ in range(count):
                writer.add_blank_page(width=float(page.mediabox.width), height=float(page.mediabox.height))
        writer.add_page(page)
    if position == len(reader.pages) + 1:
        page = reader.pages[-1]
        for _ in range(count):
            writer.add_blank_page(width=float(page.mediabox.width), height=float(page.mediabox.height))
    output = BytesIO()
    writer.write(output)
    return output.getvalue()


def insert_pdf_pages(data: bytes, source: bytes, pages: list[int], position: int) -> bytes:
    reader = PdfReader(BytesIO(data))
    source_reader = PdfReader(BytesIO(source))
    if not pages:
        raise ValueError("at least one source page is required")
    if position < 1 or position > len(reader.pages) + 1:
        raise ValueError("position is outside the document")
    if any(page < 1 or page > len(source_reader.pages) for page in pages):
        raise ValueError("a source page is outside the document")
    writer = PdfWriter()
    for index, page in enumerate(reader.pages, start=1):
        if index == position:
            for page_number in pages:
                writer.add_page(source_reader.pages[page_number - 1])
        writer.add_page(page)
    if position == len(reader.pages) + 1:
        for page_number in pages:
            writer.add_page(source_reader.pages[page_number - 1])
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


def protect_pdf(data: bytes, password: str) -> bytes:
    if not password:
        raise ValueError("password is required")
    output = BytesIO()
    # pikepdf handles UTF-8 passwords; pypdf's legacy encryption path can
    # raise ``Strings must be encoded before hashing`` for Thai passwords.
    with pikepdf.open(BytesIO(data)) as pdf:
        pdf.save(output, encryption=pikepdf.Encryption(user=password, owner=password, R=6, aes=True))
    return output.getvalue()


def unlock_pdf(data: bytes, password: str) -> bytes:
    reader = PdfReader(BytesIO(data))
    if reader.is_encrypted and not reader.decrypt(password):
        raise ValueError("รหัสผ่านไม่ถูกต้อง")
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    output = BytesIO(); writer.write(output)
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
            font, color = str(item.get("font", "th-sarabun-new")), str(item.get("color", "#222222"))
            font_key = font.lower().strip()
            if font_key in JAPANESE_CID_FONTS:
                font_name = JAPANESE_CID_FONTS[font_key]
            elif font_key in {"helvetica", "helvetica-bold", "times-roman", "courier"}:
                standard_map = {
                    "helvetica": "Helvetica",
                    "helvetica-bold": "Helvetica-Bold",
                    "times-roman": "Times-Roman",
                    "courier": "Courier",
                }
                font_name = standard_map.get(font_key, "Helvetica")
            else:
                custom_name = f"PDFLover-{font_key}"
                if custom_name in pdfmetrics.getRegisteredFontNames():
                    font_name = custom_name
                elif font_key in pdfmetrics.getRegisteredFontNames():
                    font_name = font_key
                else:
                    font_name = DEFAULT_THAI_FONT_NAME or "Helvetica"
            if not color.startswith("#") or len(color) != 7:
                raise ValueError("color must be a hex value")
            try: rgb = tuple(int(color[i:i + 2], 16) / 255 for i in (1, 3, 5))
            except ValueError as exc: raise ValueError("color must be a hex value") from exc
            layer.setFont(font_name, size)
            layer.setFillColorRGB(*rgb)
            lines = text.splitlines() or [text]
            leading = size * 1.25
            for line_idx, raw_line in enumerate(lines):
                line = shape_thai(raw_line)
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


def word_to_pdf(data: bytes, filename: str) -> bytes:
    """Convert DOCX XML to HTML/CSS, then render the same HTML as PDF."""
    try:
        from weasyprint import HTML
    except ImportError as exc:
        raise RuntimeError("WeasyPrint is required for Word to PDF conversion") from exc
    suffix = Path(filename).suffix.lower()
    if suffix not in {".doc", ".docx"}:
        raise ValueError("Only .doc and .docx files are supported")
    if suffix == ".doc":
        raise ValueError("Legacy .doc files are not supported without an office converter; please save as .docx")
    sarabun_file = FONTS_DIR / "THSarabunNew.ttf"
    font_path = str(sarabun_file) if sarabun_file.is_file() else FONT_FILES.get("th-sarabun-new", "")
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships", "pr": "http://schemas.openxmlformats.org/package/2006/relationships"}
    with zipfile.ZipFile(BytesIO(data)) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))
        rels = ET.fromstring(archive.read("word/_rels/document.xml.rels"))
        media = {}
        for rel in rels.findall("pr:Relationship", ns):
            target = rel.attrib.get("Target", "")
            if target.startswith("media/"):
                name = f"word/{target}"
                if name in archive.namelist():
                    media[rel.attrib["Id"]] = archive.read(name)
        section = root.find(".//w:sectPr", ns)
        def twips(name, fallback=1440):
            node = section.find(f"w:{name}", ns) if section is not None else None
            return int(node.attrib.get(f"{{{ns['w']}}}w", fallback)) if node is not None else fallback
        margin_top, margin_right, margin_bottom, margin_left = [twips(name) / 56.6929 for name in ("pgMar", "pgMar", "pgMar", "pgMar")]
        if section is not None:
            pg = section.find("w:pgMar", ns)
            values = [pg.attrib.get(f"{{{ns['w']}}}{name}") for name in ("top", "right", "bottom", "left")] if pg is not None else []
            margin_top, margin_right, margin_bottom, margin_left = [(int(value) / 56.6929 if value else 25.4) for value in values] if values else (25.4, 25.4, 25.4, 25.4)
        def run_html(run):
            text = "".join((node.text or "") for node in run.findall("w:t", ns))
            text += "<br>" * len(run.findall("w:br", ns))
            text = html.escape(text).replace("\n", "<br>")
            props = run.find("w:rPr", ns)
            styles = []
            if props is not None and props.find("w:b", ns) is not None: styles.append("font-weight:700")
            if props is not None and props.find("w:i", ns) is not None: styles.append("font-style:italic")
            if props is not None and props.find("w:u", ns) is not None: styles.append("text-decoration:underline")
            size = props.find("w:sz", ns) if props is not None else None
            if size is not None: styles.append(f"font-size:{int(size.attrib.get(f'{{{ns["w"]}}}val', 32)) / 2:g}pt")
            return f'<span style="{";".join(styles)}">{text}</span>'
        def paragraph_html(paragraph):
            props = paragraph.find("w:pPr", ns)
            align_node = props.find("w:jc", ns) if props is not None else None
            align = align_node.attrib.get(f"{{{ns['w']}}}val", "left") if align_node is not None else "left"
            content = "".join(run_html(run) for run in paragraph.findall("w:r", ns))
            return f'<p class="p-{align}">{content or "&nbsp;"}</p>'
        def table_html(table):
            rows = []
            for row in table.findall("w:tr", ns):
                cells = []
                for cell in row.findall("w:tc", ns):
                    cells.append("<td>" + "".join(paragraph_html(p) for p in cell.findall("w:p", ns)) + "</td>")
                rows.append("<tr>" + "".join(cells) + "</tr>")
            return "<table>" + "".join(rows) + "</table>"
        body = root.find(".//w:body", ns)
        blocks = []
        for child in list(body or []):
            if child.tag == f"{{{ns['w']}}}p": blocks.append(paragraph_html(child))
            elif child.tag == f"{{{ns['w']}}}tbl": blocks.append(table_html(child))
    html_doc = f'''<!doctype html><html><head><meta charset="utf-8"><style>
      @font-face {{ font-family: Sarabun; src: url("file://{font_path}"); }}
      @page {{ size: A4; margin: {margin_top:g}mm {margin_right:g}mm {margin_bottom:g}mm {margin_left:g}mm; }}
      body {{ font-family: Sarabun; font-size: 16pt; line-height: 1.15; color: #000; }}
      p {{ margin: 0 0 3mm; }} .p-center {{ text-align:center; }} .p-right {{ text-align:right; }} .p-justify {{ text-align:justify; }}
      table {{ width:100%; border-collapse:collapse; margin: 3mm 0; }} td {{ border: .3mm solid #888; padding: 1.5mm; vertical-align:top; }} td p {{ margin:0; }}
    </style></head><body>{''.join(blocks) or '<p>เอกสารว่าง</p>'}</body></html>'''
    return HTML(string=html_doc, base_url=str(Path(font_path).parent)).write_pdf()


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
        registered_font = DEFAULT_THAI_FONT_NAME or "Helvetica"

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
        text = shape_thai(text)

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
        registered_font = DEFAULT_THAI_FONT_NAME or "Helvetica"

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
                cv.drawCentredString(0, -font_size / 3.0, shape_thai(text))

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


def add_notes_pdf(
    data: bytes,
    overlays: dict[int | str, str],
) -> bytes:
    """
    Merge visual note/markup overlays (base64 PNG) onto their corresponding PDF pages.
    overlays: { "1": "data:image/png;base64,...", "2": ... }
    """
    reader = PdfReader(BytesIO(data))
    writer = PdfWriter()

    parsed_overlays: dict[int, str] = {}
    if isinstance(overlays, dict):
        for k, v in overlays.items():
            try:
                parsed_overlays[int(k)] = str(v)
            except (ValueError, TypeError):
                continue

    for idx, page in enumerate(reader.pages):
        page_num = idx + 1
        raw_val = parsed_overlays.get(page_num)
        if raw_val:
            if "," in raw_val:
                raw_val = raw_val.split(",", 1)[1]
            try:
                png_bytes = base64.b64decode(raw_val)
                overlay_io = BytesIO(png_bytes)

                pw = float(page.mediabox.width)
                ph = float(page.mediabox.height)

                over_pdf_io = BytesIO()
                cv = canvas.Canvas(over_pdf_io, pagesize=(pw, ph))
                cv.drawImage(ImageReader(overlay_io), 0, 0, width=pw, height=ph, mask="auto")
                cv.save()

                over_pdf_io.seek(0)
                page.merge_page(PdfReader(over_pdf_io).pages[0], over=True)
            except (ValueError, OSError) as exc:
                raise ValueError(f"Could not apply note overlay on page {page_num}: {exc}") from exc

        writer.add_page(page)

    output = BytesIO()
    writer.write(output)
    return output.getvalue()


def add_signatures_pdf(
    data: bytes,
    signatures: list[dict],
) -> bytes:
    """
    Merge signature images onto their corresponding PDF pages.
    signatures is a list of dicts:
    [
        {
            "page": 1,
            "image": "data:image/png;base64,...",
            "x": 0.5,       # 0.0 to 1.0 (from left)
            "y": 0.8,       # 0.0 to 1.0 (from top)
            "width": 0.25,  # 0.0 to 1.0 (relative to page width)
            "height": 0.12, # optional 0.0 to 1.0 (relative to page height)
        }
    ]
    """
    if not signatures:
        return data

    reader = PdfReader(BytesIO(data))
    writer = PdfWriter()

    # Group signatures by page
    page_sigs: dict[int, list[dict]] = {}
    for sig in signatures:
        try:
            p = int(sig.get("page", 1))
            page_sigs.setdefault(p, []).append(sig)
        except (ValueError, TypeError):
            continue

    for idx, page in enumerate(reader.pages):
        page_num = idx + 1
        sigs_for_page = page_sigs.get(page_num, [])

        if sigs_for_page:
            pw = float(page.mediabox.width)
            ph = float(page.mediabox.height)

            over_pdf_io = BytesIO()
            cv = canvas.Canvas(over_pdf_io, pagesize=(pw, ph))

            for sig in sigs_for_page:
                raw_img = sig.get("image", "")
                if "," in raw_img:
                    raw_img = raw_img.split(",", 1)[1]
                if not raw_img:
                    continue

                try:
                    img_bytes = base64.b64decode(raw_img)
                    img_reader = ImageReader(BytesIO(img_bytes))
                    img_w, img_h = img_reader.getSize()

                    x_ratio = float(sig.get("x", 0.1))
                    y_ratio = float(sig.get("y", 0.8))
                    w_ratio = float(sig.get("width", 0.25))
                    h_ratio = float(sig.get("height", 0.0))

                    w_pt = w_ratio * pw
                    if h_ratio > 0:
                        h_pt = h_ratio * ph
                    elif img_w > 0:
                        h_pt = (w_pt / img_w) * img_h
                    else:
                        h_pt = w_pt * 0.5

                    x_pt = x_ratio * pw
                    # Invert Y from top-origin (frontend) to bottom-origin (PDF)
                    y_pt = (1.0 - y_ratio) * ph - h_pt

                    cv.drawImage(img_reader, x_pt, y_pt, width=w_pt, height=h_pt, mask="auto")
                except Exception as exc:
                    raise ValueError(f"Could not render signature on page {page_num}: {exc}") from exc

            cv.save()
            over_pdf_io.seek(0)
            page.merge_page(PdfReader(over_pdf_io).pages[0], over=True)

        writer.add_page(page)

    output = BytesIO()
    writer.write(output)
    return output.getvalue()
