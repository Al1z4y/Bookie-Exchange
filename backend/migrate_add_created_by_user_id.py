"""
Migration script to add created_by_user_id column to exchange_points table.
"""
import sqlite3
import os
import json
from pathlib import Path
from datetime import datetime

# Get database file path
BACKEND_DIR = Path(__file__).parent
DB_FILE = BACKEND_DIR / "booksexchange.db"
LOG_PATH = Path(__file__).parent.parent / ".cursor" / "debug.log"

def log_debug(location, message, data=None, hypothesis_id=None):
    """Write debug log entry."""
    try:
        log_entry = {
            "sessionId": "debug-session",
            "runId": "migration-check",
            "hypothesisId": hypothesis_id,
            "location": location,
            "message": message,
            "data": data or {},
            "timestamp": int(datetime.now().timestamp() * 1000)
        }
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception:
        pass  # Silently fail if logging fails

def migrate():
    """Add created_by_user_id column to exchange_points table."""
    # #region agent log
    log_debug("migrate_add_created_by_user_id.py:12", "Migration started", {
        "db_file": str(DB_FILE),
        "db_exists": DB_FILE.exists()
    }, "A")
    # #endregion
    
    if not DB_FILE.exists():
        # #region agent log
        log_debug("migrate_add_created_by_user_id.py:17", "Database file not found", {
            "db_file": str(DB_FILE)
        }, "A")
        # #endregion
        print(f"[ERROR] Database file not found: {DB_FILE}")
        print("        The database will be created automatically on next startup.")
        return True
    
    try:
        conn = sqlite3.connect(str(DB_FILE))
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(exchange_points)")
        columns_info = cursor.fetchall()
        columns = [row[1] for row in columns_info]
        
        # #region agent log
        log_debug("migrate_add_created_by_user_id.py:25", "Checked table schema", {
            "table": "exchange_points",
            "columns": columns,
            "has_created_by_user_id": 'created_by_user_id' in columns,
            "all_columns_info": [{"name": row[1], "type": row[2]} for row in columns_info]
        }, "A")
        # #endregion
        
        if 'created_by_user_id' in columns:
            # #region agent log
            log_debug("migrate_add_created_by_user_id.py:28", "Column already exists", {}, "A")
            # #endregion
            print("[OK] Column 'created_by_user_id' already exists in exchange_points table")
            conn.close()
            return True
        
        print("[INFO] Adding 'created_by_user_id' column to exchange_points table...")
        
        # #region agent log
        log_debug("migrate_add_created_by_user_id.py:35", "Before ALTER TABLE", {
            "columns_before": columns
        }, "A")
        # #endregion
        
        # Add column as nullable first (for existing rows)
        cursor.execute("""
            ALTER TABLE exchange_points 
            ADD COLUMN created_by_user_id INTEGER 
            REFERENCES users(id)
        """)
        
        # #region agent log
        log_debug("migrate_add_created_by_user_id.py:42", "After ALTER TABLE", {
            "alter_executed": True
        }, "A")
        # #endregion
        
        # Create index
        try:
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS ix_exchange_points_created_by_user_id 
                ON exchange_points(created_by_user_id)
            """)
            # #region agent log
            log_debug("migrate_add_created_by_user_id.py:50", "Index created", {}, "A")
            # #endregion
        except sqlite3.OperationalError as e:
            # #region agent log
            log_debug("migrate_add_created_by_user_id.py:53", "Index creation error", {
                "error": str(e)
            }, "A")
            # #endregion
            if "already exists" not in str(e).lower():
                raise
        
        conn.commit()
        
        # Verify column was added
        cursor.execute("PRAGMA table_info(exchange_points)")
        columns_after = [row[1] for row in cursor.fetchall()]
        
        # #region agent log
        log_debug("migrate_add_created_by_user_id.py:65", "After commit - schema check", {
            "columns_after": columns_after,
            "has_created_by_user_id": 'created_by_user_id' in columns_after
        }, "A")
        # #endregion
        
        print("[OK] Successfully added 'created_by_user_id' column to exchange_points table")
        
        # Check if there are existing rows without created_by_user_id
        cursor.execute("SELECT COUNT(*) FROM exchange_points WHERE created_by_user_id IS NULL")
        null_count = cursor.fetchone()[0]
        
        if null_count > 0:
            print(f"[WARN] Found {null_count} existing exchange points without created_by_user_id")
            print("       These will remain NULL. New exchange points will require a user_id.")
        
        conn.close()
        return True
        
    except Exception as e:
        # #region agent log
        log_debug("migrate_add_created_by_user_id.py:69", "Migration exception", {
            "error": str(e),
            "error_type": type(e).__name__
        }, "A")
        # #endregion
        print(f"[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Running migration: Add created_by_user_id to exchange_points")
    print("=" * 60)
    success = migrate()
    print("=" * 60)
    if success:
        print("[OK] Migration completed successfully!")
    else:
        print("[ERROR] Migration failed. Please check the error messages above.")
        exit(1)
