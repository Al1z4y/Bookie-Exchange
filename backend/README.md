# BOOKIE Backend API

FastAPI backend for the BOOKIE book exchange platform. Provides RESTful API endpoints for book management, exchanges, messaging, forums, and QR code-based history tracking.

## Project Structure

```
backend/
└── app/
    ├── main.py              # FastAPI application entry point
    ├── core/                # Core configuration and utilities
    │   ├── config.py        # Application settings
    │   ├── database.py      # Database configuration
    │   └── security.py      # Authentication utilities
    ├── models/              # SQLAlchemy database models
    ├── schemas/             # Pydantic request/response schemas
    ├── routes/              # API route handlers
    └── services/            # Business logic services
```

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. **Database Setup (SQLite - Default for Fast Local Development):**
   
   SQLite is the default database and requires no additional setup! The database file (`booksexchange.db`) will be created automatically in the `backend/` directory when you first run the application.

3. **Optional: Create a `.env` file in the `backend/` directory** (optional for development):
```bash
# Application Settings
APP_NAME=BooksExchange API
APP_VERSION=1.0.0
DEBUG=False

# Database Configuration
# SQLite (default - fast local development)
DATABASE_URL=sqlite:///./booksexchange.db

# For PostgreSQL (Neon) production deployment, uncomment:
# DATABASE_URL=postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require

DB_ECHO=False

# JWT Authentication
# Generate a secure secret key: python -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
```

4. **Initialize the database tables** (optional - tables are auto-created on startup):
```bash
python init_db.py
```

This will create all necessary tables in your SQLite database. The database file will be located at `backend/booksexchange.db`.

**Note:** Tables are also automatically created when you start the FastAPI server (via startup event).

6. Run the application:
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

API documentation:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Database Tables

The following tables will be created in your database:

- `users` - User accounts and profiles
- `books` - Book listings with permanent UUID identity
- `book_history` - QR code-based reading history (append-only)
- `wishlist` - User wishlists
- `exchange_requests` - Book exchange requests
- `exchange_disputes` - Exchange dispute records
- `payment_transactions` - Payment and point purchase records
- `point_transactions` - Points transaction history
- `forum_posts` - Forum discussion posts
- `forum_replies` - Forum post replies
- `forum_votes` - Forum voting records
- `messages` - In-app messages
- `exchange_points` - Physical exchange point locations

## Database Migration

If you're upgrading from an older version, run the migration script to add the `permanent_id` column:

```bash
python migrate_add_permanent_id.py
```

This will:
- Add `permanent_id` column to existing books
- Generate UUIDs for all existing books
- Create unique index on `permanent_id`

## API Features

### Book Management
- Create, read, update, delete books
- Search and filter books
- QR code generation and scanning
- Book history tracking

### Exchange System
- Point-based exchange requests
- Circular exchange detection
- Ownership transfer
- Dispute handling

### Messaging
- User-to-user messaging
- Conversation threads
- Unread message tracking

### Forums
- Post creation and replies
- Voting system
- Abuse detection
- Anonymous posting

### Points & Payments
- Point balance management
- Point purchase system
- Transaction history

## Performance Optimizations

- **Eager Loading**: Uses SQLAlchemy `joinedload` to prevent N+1 queries
- **Connection Pooling**: Optimized pool size (20 connections, 40 max overflow)
- **Indexed Queries**: All foreign keys and search fields are indexed
- **Pagination**: All list endpoints support pagination

## Environment Variables

See `env.template` for all available configuration options.
