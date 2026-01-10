"""
User model for authentication and user management.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    """User model for authentication and profile management."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    points_balance = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    books = relationship("Book", back_populates="owner", foreign_keys="Book.owner_id")
    exchange_requests_sent = relationship("ExchangeRequest", back_populates="requester", foreign_keys="ExchangeRequest.requester_id")
    exchange_requests_received = relationship("ExchangeRequest", back_populates="owner", foreign_keys="ExchangeRequest.owner_id")
    point_transactions = relationship("PointTransaction", back_populates="user")
    payment_transactions = relationship("PaymentTransaction", back_populates="user")
    forum_posts = relationship("ForumPost", back_populates="author")
    forum_replies = relationship("ForumReply", back_populates="author")
    messages_sent = relationship("Message", back_populates="sender", foreign_keys="Message.sender_id")
    messages_received = relationship("Message", back_populates="recipient", foreign_keys="Message.recipient_id")
    wishlist_items = relationship("Wishlist", back_populates="user")

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, email={self.email})>"
