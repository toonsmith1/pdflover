"""Single-admin advertising campaign storage for the local PDF Lover app."""
import json
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ADS_ROOT = Path(__file__).resolve().parent.parent / "ads"
CAMPAIGNS_DIR = ADS_ROOT / "campaigns"


def _path(campaign_id: str) -> Path:
    if not campaign_id or any(char not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for char in campaign_id):
        raise ValueError("invalid campaign id")
    return CAMPAIGNS_DIR / f"{campaign_id}.json"


def list_campaigns() -> list[dict[str, Any]]:
    CAMPAIGNS_DIR.mkdir(parents=True, exist_ok=True)
    result = []
    for path in sorted(CAMPAIGNS_DIR.glob("*.json")):
        try:
            result.append(json.loads(path.read_text(encoding="utf-8")))
        except (OSError, json.JSONDecodeError):
            continue
    return result


def get_campaign(campaign_id: str) -> dict[str, Any] | None:
    path = _path(campaign_id)
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def save_campaign(campaign_id: str, data: dict[str, Any]) -> dict[str, Any]:
    path = _path(campaign_id)
    CAMPAIGNS_DIR.mkdir(parents=True, exist_ok=True)
    payload = {**data, "id": campaign_id, "updated_at": datetime.now(timezone.utc).isoformat()}
    temp = path.with_suffix(".tmp")
    temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    temp.replace(path)
    return payload


def delete_campaign(campaign_id: str) -> bool:
    path = _path(campaign_id)
    if not path.exists():
        return False
    path.unlink()
    return True


def token_matches(provided: str | None, expected: str) -> bool:
    return bool(expected and provided and secrets.compare_digest(provided, expected))
