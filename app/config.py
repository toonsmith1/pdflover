from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    host: str = "127.0.0.1"
    port: int = 8000
    max_upload_mb: int = 50
    temp_file_ttl_minutes: int = 60
    typhoon_ocr_api_key: str = ""
    typhoon_ocr_base_url: str = ""
    ads_admin_token: str = ""
    ads_feed_url: str = "https://raw.githubusercontent.com/toonsmith1/pdflover/main/ads/campaigns/active.json"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
