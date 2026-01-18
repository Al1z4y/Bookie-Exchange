"""
Quick script to add qr_code_id column to existing books table.
Run this from the backend directory: python add_qr_code_id_column.py
"""
import sqlite3
import os
from pathlib import Path

# Get database path
backend_dir = Path(__file__).parent
db_path = backend_dir / "booksexchange.db"

if not db_path.exists():
    print(f"[ERROR] Database file not found: {db_path}")
    exit(1)

print(f"Connecting to database: {db_path}")

try:
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Check if column exists
    cursor.execute("PRAGMA table_info(books)")
    columns = [row[1] for row in cursor.fetchall()]
    
    if 'qr_code_id' in columns:
        print("[OK] Column 'qr_code_id' already exists.")
        conn.close()
        exit(0)
    
    print("Adding 'qr_code_id' column...")
    cursor.execute("ALTER TABLE books ADD COLUMN qr_code_id VARCHAR(50) NULL")
    
    print("Creating index...")
    cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_books_qr_code_id ON books(qr_code_id)")
    
    conn.commit()
    conn.close()
    
    print("[OK] Migration completed! Column 'qr_code_id' added successfully.")
    print("You can now restart your backend server.")
    
except Exception as e:
    print(f"[ERROR] Migration failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
