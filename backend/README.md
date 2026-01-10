# BooksExchange Backend

FastAPI backend for the BooksExchange platform.

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

2. Set up Neon PostgreSQL database:
   - Go to [Neon Console](https://console.neon.tech/)
   - Create a new project
   - Copy your connection string from the dashboard
   - The connection string should look like:
     ```
     postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
     ```

3. Create a `.env` file in the `backend/` directory:
```bash
# Application Settings
APP_NAME=BooksExchange API
APP_VERSION=1.0.0
DEBUG=False

# Database Configuration (Neon PostgreSQL)
# Get your connection string from: https://console.neon.tech/
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
DB_ECHO=False

# JWT Authentication
# Generate a secure secret key: python -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
```

4. Update `.env` with:
   - Your Neon database connection string
   - A secure secret key (generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`)

5. Initialize the database tables:
```bash
python init_db.py
```

This will create all necessary tables in your Neon PostgreSQL database. You can view them in your [Neon Console](https://console.neon.tech/).

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

The following tables will be created in your Neon PostgreSQL database:

- `users` - User accounts and profiles
- `books` - Book listings
- `book_history` - QR code scanning history
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

You can view and manage these tables in your [Neon Console](https://console.neon.tech/).
