"""
Database initialization script.
Run this script to create all tables in your Neon PostgreSQL database.

Usage:
    python init_db.py
"""
import sys
from pathlib import Path

# Add the backend directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import Base, engine
from app.models import (
    User, Book, BookHistory, Wishlist,
    ExchangeRequest, ExchangeDispute,
    PaymentTransaction,
    PointTransaction,
    ForumPost, ForumReply, ForumVote,
    Message,
    ExchangePoint,
)


def init_db():
    """Create all database tables."""
    print("=" * 60)
    print("Initializing BooksExchange Database")
    print("=" * 60)
    print(f"Database URL: {engine.url}")
    print("\nCreating tables...")
    
    try:
        Base.metadata.create_all(bind=engine)
        print("\n✅ Database tables created successfully!")
        print("\nCreated tables:")
        for table_name in Base.metadata.tables.keys():
            print(f"  - {table_name}")
        print("\nYou can now view these tables in your Neon console!")
    except Exception as e:
        print(f"\n❌ Error creating tables: {e}")
        sys.exit(1)


def drop_db():
    """Drop all database tables (use with caution!)."""
    print("=" * 60)
    print("⚠️  WARNING: This will drop ALL tables!")
    print("=" * 60)
    response = input("Are you sure you want to continue? (yes/no): ")
    if response.lower() != "yes":
        print("Cancelled.")
        return
    
    try:
        Base.metadata.drop_all(bind=engine)
        print("\n✅ All database tables dropped!")
    except Exception as e:
        print(f"\n❌ Error dropping tables: {e}")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "drop":
        drop_db()
    else:
        init_db()
