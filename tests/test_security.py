from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_csrf_origin_rejected_for_evil_site():
    response = client.post(
        "/api/word-to-pdf",
        headers={"Origin": "https://evil-attacker.com"},
        files={"file": ("test.docx", b"fake", "application/octet-stream")},
    )
    assert response.status_code == 403
    assert "Forbidden" in response.json().get("detail", "")


def test_csrf_referer_rejected_for_evil_site():
    response = client.post(
        "/api/word-to-pdf",
        headers={"Referer": "https://evil-attacker.com/malicious-page"},
        files={"file": ("test.docx", b"fake", "application/octet-stream")},
    )
    assert response.status_code == 403
    assert "Forbidden" in response.json().get("detail", "")


def test_csrf_rejects_origin_with_unapproved_port():
    response = client.post(
        "/api/word-to-pdf",
        headers={"Origin": "http://127.0.0.1:9999"},
        files={"file": ("test.docx", b"fake", "application/octet-stream")},
    )
    assert response.status_code == 403


def test_csrf_rejects_missing_origin_and_referer_on_real_host():
    response = client.post(
        "/api/word-to-pdf",
        headers={"Host": "127.0.0.1:8000"},
        files={"file": ("test.docx", b"fake", "application/octet-stream")},
    )
    assert response.status_code == 403


def test_csrf_allowed_for_local_origin():
    # Health check is GET, should always succeed
    resp_get = client.get("/api/health", headers={"Origin": "https://evil.com"})
    assert resp_get.status_code == 200

    # Local POST should pass through the CSRF middleware
    resp_post = client.post(
        "/api/word-to-pdf",
        headers={"Origin": "http://127.0.0.1:8000"},
        files={"file": ("test.docx", b"PK\x03\x04fake", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    # Status code might be 400 (corrupt docx) but NOT 403 Forbidden
    assert resp_post.status_code != 403
