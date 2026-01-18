"""
Database initialization and reset utilities.
Handles database creation, dropping, and resetting for SQLite and PostgreSQL.
"""
import os
from pathlib import Path
from app.core.database import Base, engine
from app.core.config import settings
from app.models import (
    User, Book, BookHistory, Wishlist,
    ExchangeRequest, ExchangeDispute,
    PaymentTransaction,
    PointTransaction,
    ForumPost, ForumReply, ForumVote,
    Message,
    ExchangePoint,
)


def get_db_file_path():
    """Get the SQLite database file path from DATABASE_URL."""
    if settings.DATABASE_URL.startswith("sqlite"):
        # Extract file path from sqlite:///./booksexchange.db
        db_url = settings.DATABASE_URL.replace("sqlite:///", "")
        # Handle relative paths
        if db_url.startswith("./"):
            # Get backend directory
            backend_dir = Path(__file__).parent.parent.parent
            db_path = backend_dir / db_url[2:]  # Remove "./"
        else:
            db_path = Path(db_url)
        return str(db_path)
    return None


def reset_database():
    """
    Reset the database by dropping all tables and recreating them.
    For SQLite, this also removes the database file for a clean start.
    """
    is_sqlite = settings.DATABASE_URL.startswith("sqlite")
    
    print("=" * 60)
    print("Resetting Database")
    print("=" * 60)
    
    if is_sqlite:
        # For SQLite, drop all tables first, then remove the file
        print("Dropping all tables...")
        try:
            Base.metadata.drop_all(bind=engine)
            print("✅ All tables dropped")
        except Exception as e:
            print(f"⚠️  Warning: Error dropping tables: {e}")
        
        # Remove the database file for a completely fresh start
        db_file = get_db_file_path()
        if db_file and os.path.exists(db_file):
            try:
                os.remove(db_file)
                print(f"✅ Removed database file: {db_file}")
            except Exception as e:
                print(f"⚠️  Warning: Could not remove database file: {e}")
    else:
        # For PostgreSQL, just drop all tables
        print("Dropping all tables...")
        try:
            Base.metadata.drop_all(bind=engine)
            print("✅ All tables dropped")
        except Exception as e:
            print(f"⚠️  Warning: Error dropping tables: {e}")
    
    # Create all tables with correct schema
    print("\nCreating all tables with correct schema...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created successfully!")
        
        # List created tables
        print("\nCreated tables:")
        for table_name in sorted(Base.metadata.tables.keys()):
            print(f"  - {table_name}")
        
        if is_sqlite:
            db_file = get_db_file_path()
            if db_file:
                print(f"\n📊 SQLite database file: {db_file}")
        else:
            print("\n📊 PostgreSQL database reset complete")
        
        return True
    except Exception as e:
        print(f"\n❌ Error creating tables: {e}")
        import traceback
        traceback.print_exc()
        return False


def init_db():
    """Create all database tables if they don't exist."""
    print("=" * 60)
    print("Initializing Database")
    print("=" * 60)
    print(f"Database URL: {settings.DATABASE_URL}")
    print("\nCreating tables...")
    
    try:
        Base.metadata.create_all(bind=engine)
        print("\n✅ Database tables initialized!")
        
        # List tables
        print("\nAvailable tables:")
        for table_name in sorted(Base.metadata.tables.keys()):
            print(f"  - {table_name}")
        
        if settings.DATABASE_URL.startswith("sqlite"):
            db_file = get_db_file_path()
            if db_file:
                print(f"\n📊 SQLite database file: {db_file}")
        else:
            print("\n📊 PostgreSQL database connected")
        
        return True
    except Exception as e:
        print(f"\n❌ Error initializing database: {e}")
        import traceback
        traceback.print_exc()
        return False


def drop_db():
    """Drop all database tables (use with caution!)."""
    print("=" * 60)
    print("⚠️  WARNING: This will drop ALL tables!")
    print("=" * 60)
    
    is_sqlite = settings.DATABASE_URL.startswith("sqlite")
    
    try:
        Base.metadata.drop_all(bind=engine)
        print("\n✅ All database tables dropped!")
        
        if is_sqlite:
            # Optionally remove the file
            db_file = get_db_file_path()
            if db_file and os.path.exists(db_file):
                response = input(f"\nRemove database file '{db_file}'? (yes/no): ")
                if response.lower() == "yes":
                    os.remove(db_file)
                    print(f"✅ Database file removed: {db_file}")
        
        return True
    except Exception as e:
        print(f"\n❌ Error dropping tables: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        if command == "reset":
            reset_database()
        elif command == "drop":
            drop_db()
        else:
            print(f"Unknown command: {command}")
            print("Usage: python -m app.core.db_init [reset|drop]")
            print("  reset - Drop and recreate all tables (fresh start)")
            print("  drop  - Drop all tables (with confirmation)")
    else:
        init_db()
