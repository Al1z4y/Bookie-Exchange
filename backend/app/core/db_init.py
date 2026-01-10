"""
Database initialization script.
Creates all tables in the database.
"""
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


def init_db():
    """Create all database tables."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")


def drop_db():
    """Drop all database tables."""
    print("Dropping all database tables...")
    Base.metadata.drop_all(bind=engine)
    print("All database tables dropped!")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "drop":
        drop_db()
    else:
        init_db()
