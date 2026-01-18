"""
Migration script to add qr_code_id column to books table.
"""
import sqlite3
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings

def migrate_add_qr_code_id():
    """Add qr_code_id column to books table if it doesn't exist."""
    
    if not settings.DATABASE_URL.startswith("sqlite"):
        print("[ERROR] This migration is for SQLite only.")
        print(f"   Current database: {settings.DATABASE_URL}")
        return False
    
    # Extract database file path from SQLite URL
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    if not os.path.isabs(db_path):
        # Relative path - make it relative to backend directory
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(backend_dir, db_path)
    
    if not os.path.exists(db_path):
        print(f"[ERROR] Database file not found: {db_path}")
        return False
    
    print(f"Migrating database: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(books)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'qr_code_id' in columns:
            print("[OK] Column 'qr_code_id' already exists in books table.")
            conn.close()
            return True
        
        print("   Adding 'qr_code_id' column to books table...")
        
        # Add the column
        cursor.execute("""
            ALTER TABLE books 
            ADD COLUMN qr_code_id VARCHAR(50) NULL
        """)
        
        # Create index for qr_code_id
        print("   Creating index on qr_code_id...")
        try:
            cursor.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS ix_books_qr_code_id 
                ON books(qr_code_id)
            """)
        except sqlite3.OperationalError as e:
            if "already exists" not in str(e).lower():
                print(f"   [WARNING] Index creation warning: {e}")
        
        conn.commit()
        conn.close()
        
        print("[OK] Migration completed successfully!")
        print("   Column 'qr_code_id' added to books table.")
        return True
        
    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("\nStarting migration: Add qr_code_id to books table\n")
    success = migrate_add_qr_code_id()
    
    if success:
        print("\n[OK] Migration completed!")
        print("   You can now restart your backend server.")
    else:
        print("\n[ERROR] Migration failed!")
        print("   Please check the error messages above.")
        sys.exit(1)
