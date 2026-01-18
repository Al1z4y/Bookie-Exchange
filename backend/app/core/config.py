"""
Application configuration settings.
Loads environment variables and provides configuration values.
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional

# Get the backend directory (parent of app directory)
BACKEND_DIR = Path(__file__).parent.parent.parent
ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    # Pydantic v2 config
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE) if ENV_FILE.exists() else None,
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",  # Ignore extra env vars
    )

    # Application
    APP_NAME: str = "BooksExchange API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    # SQLite for fast local development (default)
    # Database file will be created in the backend directory
    DATABASE_URL: str = "sqlite:///./booksexchange.db"
    DB_ECHO: bool = False

    # JWT Authentication
    # For development only - MUST be set in production via .env
    SECRET_KEY: str = "dev-secret-key-change-in-production-please-use-secrets-token-urlsafe-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8000"

    # OpenAI API (optional - for intelligent book pricing)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-3.5-turbo"  # Use gpt-4 for better results
    ENABLE_AI_PRICING: bool = True  # Set to False to disable AI pricing

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Warn if using defaults (development mode)
        if not ENV_FILE.exists():
            import warnings
            warnings.warn(
                f".env file not found at {ENV_FILE}. Using default values for development. "
                "Create a .env file with DATABASE_URL and SECRET_KEY for production.",
                UserWarning
            )


# Instantiate settings once
settings = Settings()
