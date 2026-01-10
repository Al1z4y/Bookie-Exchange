"""
Migration script to add permanent_id column to existing books.
Run this script to migrate your existing database.

Usage:
    python migrate_add_permanent_id.py
"""
import uuid
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import SessionLocal, engine
from app.models.book import Book
from sqlalchemy import text

def migrate():
    """Add permanent_id column and populate it for existing books."""
    db = SessionLocal()
    
    try:
        print("Starting migration: Adding permanent_id to books table...")
        
        # Check if column already exists
        if 'postgresql' in engine.url.drivername:
            result = db.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='books' AND column_name='permanent_id'
            """))
            column_exists = result.fetchone() is not None
        else:  # SQLite
            result = db.execute(text("PRAGMA table_info(books)"))
            columns = [row[1] for row in result.fetchall()]
            column_exists = 'permanent_id' in columns
        
        if not column_exists:
            print("Adding permanent_id column...")
            if 'postgresql' in engine.url.drivername:
                db.execute(text("ALTER TABLE books ADD COLUMN permanent_id VARCHAR(36)"))
            else:  # SQLite
                db.execute(text("ALTER TABLE books ADD COLUMN permanent_id TEXT"))
            db.commit()
            print("Column added successfully")
        else:
            print("Column already exists")
        
        # Populate permanent_id for books that don't have it
        print("Populating permanent_id for existing books...")
        books_without_id = db.query(Book).filter(Book.permanent_id == None).all()
        
        if books_without_id:
            print(f"Found {len(books_without_id)} books without permanent_id")
            for book in books_without_id:
                book.permanent_id = str(uuid.uuid4())
                # Update QR code to use permanent_id
                if not book.qr_code or book.qr_code.startswith("TEMP-"):
                    book.qr_code = book.permanent_id
            
            db.commit()
            print(f"Populated permanent_id for {len(books_without_id)} books")
        else:
            print("All books already have permanent_id")
        
        # Add unique index if it doesn't exist
        print("Creating unique index on permanent_id...")
        try:
            if 'postgresql' in engine.url.drivername:
                db.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_books_permanent_id ON books(permanent_id)"))
            else:  # SQLite
                db.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_books_permanent_id ON books(permanent_id)"))
            db.commit()
            print("Index created successfully")
        except Exception as e:
            print(f"Index might already exist: {e}")
        
        print("\nMigration completed successfully!")
        print("\nNext steps:")
        print("1. After verifying everything works, you can make permanent_id NOT NULL:")
        print("   - For PostgreSQL: ALTER TABLE books ALTER COLUMN permanent_id SET NOT NULL;")
        print("   - For SQLite: This requires recreating the table (more complex)")
        
    except Exception as e:
        db.rollback()
        print(f"\nMigration failed: {e}")
        print("Rolling back changes...")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
