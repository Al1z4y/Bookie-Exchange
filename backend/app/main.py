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
        from app.models import (
            User, Book, BookHistory, Wishlist,
            ExchangeRequest, ExchangeDispute,
            PaymentTransaction,
            PointTransaction,
            ForumPost, ForumReply, ForumVote,
            Message,
            ExchangePoint,
        )
        # Create all tables if they don't exist
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables initialized!")
        print(f"📊 View tables in Neon Console: https://console.neon.tech/")
    except Exception as e:
        print(f"⚠️  Warning: Could not initialize database tables: {e}")
        print("   Make sure your DATABASE_URL in .env is correct.")


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
)

# Authentication routes
app.include_router(auth.router, prefix="/api")

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
