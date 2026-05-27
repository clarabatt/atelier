from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql://atelier:atelier@localhost:5432/atelier"
    secret_key: str = "change-me-in-production"

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/auth/google/callback"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    frontend_url: str = "http://localhost:5173"
    mobile_redirect_uri: str = ""
    # Comma-separated extra CORS origins (e.g. Expo web dev server)
    extra_origins: str = "http://localhost:8081,http://localhost:19006"
    dev_mode: bool = False


settings = Settings()
