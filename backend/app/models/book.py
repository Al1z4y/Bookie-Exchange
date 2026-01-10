"""
Book model for book listings and management.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class Book(Base):
    """Book model for book listings."""
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    permanent_id = Column(String(36), unique=True, index=True, nullable=True)  # UUID - permanent digital identity (nullable for migration)
    title = Column(String(255), nullable=False, index=True)
    author = Column(String(255), nullable=False, index=True)
    condition = Column(String(20), nullable=False)  # excellent, good, fair, poor
    description = Column(Text, nullable=True)
    image_urls = Column(JSON, default=[], nullable=False)  # JSON array for compatibility with both SQLite and PostgreSQL
    location = Column(String(255), nullable=True)
    point_value = Column(Integer, nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)
    qr_code = Column(String(255), unique=True, index=True, nullable=False)  # QR code string (can encode UUID or URL)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="books", foreign_keys=[owner_id])
    exchange_requests = relationship("ExchangeRequest", back_populates="book")
    book_history = relationship("BookHistory", back_populates="book")
    wishlist_items = relationship("Wishlist", back_populates="book")

    def __repr__(self):
        return f"<Book(id={self.id}, title={self.title}, author={self.author})>"


class BookHistory(Base):
    """Book history tracking for QR code scanning."""
    __tablename__ = "book_history"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Nullable to preserve history if user deleted
    action = Column(String(50), nullable=False)  # created, exchanged, scanned, read, etc.
    notes = Column(Text, nullable=True)  # Tips and notes from readers
    city = Column(String(255), nullable=True)  # City where book was read
    reading_duration_days = Column(Integer, nullable=True)  # How long the book was read (in days)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    book = relationship("Book", back_populates="book_history")
    user = relationship("User")  # Can be None if user is deleted

    def __repr__(self):
        return f"<BookHistory(id={self.id}, book_id={self.book_id}, action={self.action})>"


class Wishlist(Base):
    """User wishlist for books."""
    __tablename__ = "wishlist"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="wishlist_items")
    book = relationship("Book", back_populates="wishlist_items")

    def __repr__(self):
        return f"<Wishlist(id={self.id}, user_id={self.user_id}, book_id={self.book_id})>"
