"""
Database reset utility script.
Drops and recreates the SQLite database with correct schema.

Usage:
    python reset_db.py
    
This will:
1. Drop all existing tables
2. Remove the SQLite database file (if using SQLite)
3. Create all tables with correct schema from models
"""
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.db_init import reset_database

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("DATABASE RESET UTILITY")
    print("=" * 60)
    print("\n⚠️  WARNING: This will DELETE all data in your database!")
    print("   All tables will be dropped and recreated with fresh schema.\n")
    
    response = input("Are you sure you want to reset the database? (yes/no): ")
    
    if response.lower() == "yes":
        print("\n")
        success = reset_database()
        if success:
            print("\n" + "=" * 60)
            print("✅ Database reset complete!")
            print("=" * 60)
            print("\nYou can now start your FastAPI server.")
        else:
            print("\n" + "=" * 60)
            print("❌ Database reset failed!")
            print("=" * 60)
            sys.exit(1)
    else:
        print("\nReset cancelled.")
        sys.exit(0)
