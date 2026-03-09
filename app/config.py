from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application configuration settings"""
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/pdf_templates"
    
    # ─── Asset Hosting ───────────────────────────────────────────────────────────
    # Pluggable provider: change ASSET_HOST_PROVIDER in .env to switch backends.
    # Currently supported: "dropbox"
    # To add a new provider: create a module in app/services/asset_hosting/,
    # subclass BaseAssetHost, implement upload(), then register it in
    # app/services/asset_hosting/__init__.py get_asset_host().
    ASSET_HOST_PROVIDER: str = "dropbox"

    # Dropbox — set these three values in your .env file.
    # App Key + App Secret: from Dropbox App Console → Settings tab
    # Refresh Token:        run  python generate_refresh_token.py  once to obtain it
    DROPBOX_APP_KEY: str = ""
    DROPBOX_APP_SECRET: str = ""
    DROPBOX_REFRESH_TOKEN: str = ""
    DROPBOX_UPLOAD_FOLDER: str = "/pdf-template-uploader"
    
    # Application
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    APP_TITLE: str = "PDF Template API"
    APP_VERSION: str = "1.0.0"
    
    # PDF Storage
    PDF_STORAGE_DIR: str = "generated_pdfs"  # Local directory for PDF storage
    PDF_ENGINE: str = "pymupdf"  # PDF engine: "pymupdf" or "reportlab"
    
    # Session Authentication
    SESSION_COOKIE_NAME: str = "session_id"
    SESSION_MAX_AGE: int = 604800  # 7 days in seconds
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = "lax"
    SESSION_COOKIE_SECURE: bool = False  # Set True in production (HTTPS)
    
    # Default Admin User (seeded on first run if no users exist)
    DEFAULT_ADMIN_USERNAME: str = "admin"
    DEFAULT_ADMIN_PASSWORD: str = "admin123"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080"
    ]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
