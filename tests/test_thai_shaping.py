from io import BytesIO

import pypdf

from app.pdf_service import add_text_pdf, shape_thai


def test_shape_thai_descenders():
    # ญ before below vowel should cut descender (0xF70F)
    shaped = shape_thai("กตัญญู")
    assert "\uf70f" in shaped

    # ฐ before below vowel should cut descender (0xF700)
    shaped_tha = shape_thai("ฐุ")
    assert "\uf700" in shaped_tha


def test_shape_thai_vowel_reordering():
    # Misordered typing: ท + ่ + ี (tone before vowel) -> should normalize and keep both
    bad_order = "ท\u0e48\u0e35น\u0e48\u0e35"
    shaped = shape_thai(bad_order)
    # The tone mark and vowel should both be present in shaped output
    assert "\u0e35" in shaped
    assert "\u0e48" in shaped or "\uf70a" in shaped or "\uf713" in shaped


def test_shape_thai_low_tone_marks():
    # Tone mark without above vowel should use lower tone mark to avoid floating
    shaped = shape_thai("ป่า")
    # ป has upper stem, tone without above vowel -> 0xF705
    assert "\uf705" in shaped

    shaped_por = shape_thai("น่า")
    # น is normal consonant, tone without above vowel -> 0xF70A
    assert "\uf70a" in shaped_por


def test_add_text_pdf_with_thai():
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=595, height=842)
    buf = BytesIO()
    writer.write(buf)

    result = add_text_pdf(
        buf.getvalue(),
        [{"text": "ที่นี่ ญี่ปุ่น", "x": 0.1, "y": 0.5, "size": 18, "font": "th-sarabun-new", "color": "#000000"}],
    )
    assert len(result) > 0
    reader = pypdf.PdfReader(BytesIO(result))
    assert len(reader.pages) == 1
