"""
Database configuration and session management.
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# Determine if using SQLite or PostgreSQL
is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# Create database engine
# SQLite for fast local development (default)
# PostgreSQL can be used by changing DATABASE_URL in .env
if is_sqlite:
    # SQLite configuration - optimized for local development
    # Database file will be created in the backend directory
    engine = create_engine(
        settings.DATABASE_URL,
        echo=settings.DB_ECHO,
        connect_args={"check_same_thread": False},  # Required for SQLite with FastAPI
        pool_pre_ping=True,  # Verify connections before using
    )
else:
    # PostgreSQL (Neon) configuration - for production deployment
    # Requires psycopg2-binary in requirements.txt
    engine = create_engine(
        settings.DATABASE_URL,
        echo=settings.DB_ECHO,
        pool_pre_ping=True,
        pool_size=20,
        max_overflow=40,
        pool_recycle=3600,  # Recycle connections after 1 hour
        connect_args={
            "connect_timeout": 10,
            "application_name": "bookie_exchange",
        },
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """
    Dependency function to get database session.
    Yields a database session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
