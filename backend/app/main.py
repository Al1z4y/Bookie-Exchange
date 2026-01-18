

"""
FastAPI application entry point.
Initializes the app, includes routers, and sets up middleware.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root health check endpoint."""
    return {
        "message": "BooksExchange API",
        "version": settings.APP_VERSION,
        "status": "healthy",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy"}


@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup."""
    try:
        from app.core.database import Base, engine
        from app.core.config import settings
        from app.core.db_init import init_db
        
        # Import all models to ensure they're registered with Base
        from app.models import (
            User, Book, BookHistory, Wishlist,
            ExchangeRequest, ExchangeDispute,
            PaymentTransaction,
            PointTransaction,
            ForumPost, ForumReply, ForumVote,
            Message,
            ExchangePoint,
        )
        
        # Initialize database (creates tables if they don't exist)
        # This handles schema mismatches by creating missing tables/columns
        success = init_db()
        
        if success:
            if settings.DATABASE_URL.startswith("sqlite"):
                from app.core.db_init import get_db_file_path
                db_file = get_db_file_path()
                if db_file:
                    print(f"   Database file: {db_file}")
            else:
                print(f"   View tables in Neon Console: https://console.neon.tech/")
        else:
            print("\n⚠️  Database initialization had issues.")
            print("   If you're seeing schema mismatch errors, run:")
            print("   python reset_db.py")
            print("   This will reset the database with the correct schema.")
            
    except Exception as e:
        print(f"\n❌ Error initializing database: {e}")
        print("\nIf you're seeing schema mismatch errors:")
        print("  1. Run: python reset_db.py")
        print("  2. This will recreate the database with correct schema")
        print("  3. Then restart the server")
        import traceback
        traceback.print_exc()





# Include all routers
from app.routes import (
    auth,
    books,
    exchange,
    payment,
    forums,
    messages,
    points,
    exchange_points,
    qr,
)

# Authentication routes
app.include_router(auth.router, prefix="/api")

# QR code routes
app.include_router(qr.router, prefix="/api")

# Book management routes
app.include_router(books.router, prefix="/api")

# Exchange system routes
app.include_router(exchange.router, prefix="/api")

# Payment routes
app.include_router(payment.router, prefix="/api")

# Forum and discussion routes
app.include_router(forums.router, prefix="/api")

# Messaging routes
app.include_router(messages.router, prefix="/api")

# Points management routes
app.include_router(points.router, prefix="/api")

# Physical exchange points routes
app.include_router(exchange_points.router, prefix="/api")
