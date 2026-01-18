"""
Database initialization script.
Run this script to create all tables in your database.

Usage:
    python init_db.py          # Create tables
    python init_db.py drop     # Drop all tables
    python reset_db.py         # Reset database (drop + recreate)
"""
import sys
from pathlib import Path

# Add the backend directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.db_init import init_db, drop_db, reset_database

if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        if command == "drop":
            drop_db()
        elif command == "reset":
            reset_database()
        else:
            print(f"Unknown command: {command}")
            print("Usage: python init_db.py [drop|reset]")
            print("  (no args) - Create tables if they don't exist")
            print("  drop      - Drop all tables")
            print("  reset     - Drop and recreate all tables (fresh start)")
    else:
        init_db()
