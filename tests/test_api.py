import json
from io import BytesIO

from fastapi.testclient import TestClient
from reportlab.pdfgen import canvas

from app.main import app

client = TestClient(app)


def make_test_pdf(text: str = "Test PDF Page") -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer)
    c.drawString(100, 700, text)
    c.showPage()
    c.save()
    return buffer.getvalue()


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "ocr" in data


def test_merge_and_info():
    pdf1 = make_test_pdf("Page 1")
    pdf2 = make_test_pdf("Page 2")
    res = client.post(
        "/api/merge",
        files=[
            ("files", ("f1.pdf", pdf1, "application/pdf")),
            ("files", ("f2.pdf", pdf2, "application/pdf")),
        ],
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    merged = res.content

    # Check page count
    info_res = client.post("/api/pdf-info", files={"file": ("merged.pdf", merged, "application/pdf")})
    assert info_res.status_code == 200
    assert info_res.json()["pages"] == 2


def test_split():
    pdf1 = make_test_pdf("Page 1")
    pdf2 = make_test_pdf("Page 2")
    res_merge = client.post(
        "/api/merge",
        files=[
            ("files", ("f1.pdf", pdf1, "application/pdf")),
            ("files", ("f2.pdf", pdf2, "application/pdf")),
        ],
    )
    merged = res_merge.content

    res = client.post(
        "/api/split",
        files={"file": ("merged.pdf", merged, "application/pdf")},
        data={"pages": "1"},
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"

    # Test range splitting (e.g. 1-2)
    res_range = client.post(
        "/api/split",
        files={"file": ("merged.pdf", merged, "application/pdf")},
        data={"pages": "1-2"},
    )
    assert res_range.status_code == 200
    assert res_range.headers["content-type"] == "application/pdf"


def test_organize():
    pdf1 = make_test_pdf("Page 1")
    pdf2 = make_test_pdf("Page 2")
    res_merge = client.post(
        "/api/merge",
        files=[
            ("files", ("f1.pdf", pdf1, "application/pdf")),
            ("files", ("f2.pdf", pdf2, "application/pdf")),
        ],
    )
    merged = res_merge.content

    res = client.post(
        "/api/organize",
        files={"file": ("merged.pdf", merged, "application/pdf")},
        data={"order": "2,1"},
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"

    # Test thumbnails endpoint
    res_thumbs = client.post(
        "/api/pdf-thumbnails",
        files={"file": ("merged.pdf", merged, "application/pdf")},
    )
    assert res_thumbs.status_code == 200
    thumbs_data = res_thumbs.json()
    assert thumbs_data["pages"] == 2
    assert len(thumbs_data["thumbnails"]) == 2
    assert thumbs_data["thumbnails"][0].startswith("data:image/jpeg;base64,")


def test_rotate():
    pdf = make_test_pdf("Rotate me")
    res = client.post(
        "/api/rotate",
        files={"file": ("doc.pdf", pdf, "application/pdf")},
        data={"degrees": "90"},
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"


def test_rotate_per_page():
    pdf = make_test_pdf("Rotate page 1")
    res = client.post(
        "/api/rotate",
        files={"file": ("doc.pdf", pdf, "application/pdf")},
        data={"rotations": json.dumps({"1": 180})},
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"


def test_crop():
    pdf = make_test_pdf("Crop me")
    res = client.post(
        "/api/crop",
        files={"file": ("doc.pdf", pdf, "application/pdf")},
        data={"left": "10", "bottom": "10", "right": "10", "top": "10"},
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"


def test_pagenum():
    pdf = make_test_pdf("Page with number")
    res = client.post(
        "/api/pagenum",
        files={"file": ("doc.pdf", pdf, "application/pdf")},
        data={
            "position": "bottom-right",
            "page_mode": "alternate",
            "format_style": "prefix",
            "skip_first": "false",
            "start_number": "1",
        },
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"


def test_watermark():
    pdf = make_test_pdf("Watermark page")
    res = client.post(
        "/api/watermark",
        files={"file": ("doc.pdf", pdf, "application/pdf")},
        data={
            "text": "CONFIDENTIAL",
            "angle": "45",
            "opacity": "0.3",
            "position": "center",
            "layer": "over",
        },
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"


def test_note():
    pdf = make_test_pdf("Note test page")
    # small dummy 1x1 png base64
    dummy_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    res = client.post(
        "/api/note",
        files={"file": ("doc.pdf", pdf, "application/pdf")},
        data={"overlays": json.dumps({"1": dummy_b64})},
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"


def test_render_preview():
    pdf = make_test_pdf("Preview page")
    res = client.post(
        "/api/render-preview",
        files={"file": ("doc.pdf", pdf, "application/pdf")},
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "image/png"


def test_add_text():
    pdf = make_test_pdf("Background text")
    items = [
        {"text": "สวัสดี PDF Lover", "x": 0.2, "y": 0.8, "size": 18, "font": "th-sarabun-new", "color": "#79352f"},
        {"text": "Hello World in English", "x": 0.2, "y": 0.6, "size": 16, "font": "helvetica", "color": "#1e3a8a"},
        {"text": "こんにちは世界 日本語テスト", "x": 0.2, "y": 0.4, "size": 16, "font": "heisei-kaku-go", "color": "#222222"},
        {"text": "明朝体テスト", "x": 0.2, "y": 0.2, "size": 14, "font": "heisei-min", "color": "#15803d"},
    ]
    res = client.post(
        "/api/text",
        files={"file": ("doc.pdf", pdf, "application/pdf")},
        data={"items": json.dumps(items)},
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert len(res.content) > 1000


def test_compress():
    pdf = make_test_pdf("Compressible document")
    res = client.post(
        "/api/compress",
        files={"file": ("doc.pdf", pdf, "application/pdf")},
        data={"quality": "balanced"},
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"


def test_react_spa_routes():
    # Root
    res_root = client.get("/")
    assert res_root.status_code == 200
    assert "root" in res_root.text

    # Tool pages
    res_compress = client.get("/tool/compress")
    assert res_compress.status_code == 200
    assert "root" in res_compress.text

    res_text = client.get("/tool/text")
    assert res_text.status_code == 200
    assert "root" in res_text.text


def test_signature():
    pdf = make_test_pdf("Sign me")
    # Create a minimal 1x1 transparent PNG as base64
    import base64

    # 1x1 transparent PNG
    png_bytes = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    )
    sig_b64 = "data:image/png;base64," + base64.b64encode(png_bytes).decode()
    sigs = [{"page": 1, "x": 0.3, "y": 0.7, "width": 0.2, "image": sig_b64}]
    res = client.post(
        "/api/signature",
        files={"file": ("doc.pdf", pdf, "application/pdf")},
        data={"signatures": json.dumps(sigs)},
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
