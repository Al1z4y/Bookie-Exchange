# Database Migration Notes - QR Code History System

## New Field: `permanent_id`

A new field `permanent_id` (UUID) has been added to the `books` table. This is the permanent digital identity that persists across ownership transfers.

### Migration Steps

If you have an existing database, you'll need to:

1. **Add the `permanent_id` column** to existing books:
   ```sql
   -- For SQLite
   ALTER TABLE books ADD COLUMN permanent_id TEXT;
   
   -- For PostgreSQL
   ALTER TABLE books ADD COLUMN permanent_id VARCHAR(36);
   ```

2. **Generate UUIDs for existing books**:
   ```python
   # Run this migration script
   import uuid
   from app.core.database import SessionLocal
   from app.models.book import Book
   
   db = SessionLocal()
   books = db.query(Book).filter(Book.permanent_id == None).all()
   for book in books:
       book.permanent_id = str(uuid.uuid4())
   db.commit()
   ```

3. **Make the column NOT NULL** (after populating):
   ```sql
   -- For SQLite (requires recreating table)
   -- For PostgreSQL
   ALTER TABLE books ALTER COLUMN permanent_id SET NOT NULL;
   ```

4. **Add unique constraint**:
   ```sql
   CREATE UNIQUE INDEX idx_books_permanent_id ON books(permanent_id);
   ```

### Backward Compatibility

- The QR scan endpoint supports three formats:
  1. UUID (permanent_id) - new format
  2. URL format: `/books/{permanent_id}/history`
  3. Legacy `qr_code` format - for existing books

- Existing books will continue to work with their current `qr_code` values
- New books will have both `permanent_id` and `qr_code` set

### Notes

- The `permanent_id` never changes, even when book ownership transfers
- History entries reference books by `book_id` (integer), which also persists
- History is append-only and preserved even if users are deleted
