"""
Migration script to add missing columns to book_history table.
Adds: reader_name, reading_start_date, reading_end_date, cities_read, reading_notes, tips_for_next_reader
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
    
    # Check existing columns
    cursor.execute("PRAGMA table_info(book_history)")
    columns = {row[1]: row[2] for row in cursor.fetchall()}
    
    print(f"Existing columns: {list(columns.keys())}")
    
    # Columns to add
    columns_to_add = [
        ('reader_name', 'VARCHAR(100)'),
        ('reading_start_date', 'DATE'),
        ('reading_end_date', 'DATE'),
        ('cities_read', 'VARCHAR(500)'),
        ('reading_notes', 'TEXT'),
        ('tips_for_next_reader', 'TEXT'),
    ]
    
    added_count = 0
    for col_name, col_type in columns_to_add:
        if col_name not in columns:
            print(f"Adding column '{col_name}' ({col_type})...")
            try:
                cursor.execute(f"ALTER TABLE book_history ADD COLUMN {col_name} {col_type} NULL")
                added_count += 1
            except sqlite3.OperationalError as e:
                if "duplicate column" not in str(e).lower():
                    print(f"  [WARNING] Could not add {col_name}: {e}")
        else:
            print(f"Column '{col_name}' already exists.")
    
    conn.commit()
    conn.close()
    
    if added_count > 0:
        print(f"\n[OK] Migration completed! Added {added_count} column(s) to book_history table.")
    else:
        print("\n[OK] All columns already exist. No migration needed.")
    print("You can now restart your backend server.")
    
except Exception as e:
    print(f"[ERROR] Migration failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
