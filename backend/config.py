from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql://atelier:atelier@localhost:5432/atelier"
    secret_key: str = "change-me-in-production"

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/auth/google/callback"

    anthropic_api_key: str = ""
    gemini_api_key: str = ""

    frontend_url: str = "http://localhost:5173"
    dev_mode: bool = False


settings = Settings()
