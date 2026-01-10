"""
Exchange model for book exchange system.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class ExchangeStatus(str, enum.Enum):
    """Exchange request status enumeration."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


class ExchangeRequest(Base):
    """Exchange request model."""
    __tablename__ = "exchange_requests"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(SQLEnum(ExchangeStatus), default=ExchangeStatus.PENDING, nullable=False, index=True)
    points_cost = Column(Integer, nullable=False)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    book = relationship("Book", back_populates="exchange_requests")
    requester = relationship("User", back_populates="exchange_requests_sent", foreign_keys=[requester_id])
    owner = relationship("User", back_populates="exchange_requests_received", foreign_keys=[owner_id])
    disputes = relationship("ExchangeDispute", back_populates="exchange")

    def __repr__(self):
        return f"<ExchangeRequest(id={self.id}, book_id={self.book_id}, status={self.status})>"


class ExchangeDispute(Base):
    """Exchange dispute model."""
    __tablename__ = "exchange_disputes"

    id = Column(Integer, primary_key=True, index=True)
    exchange_id = Column(Integer, ForeignKey("exchange_requests.id"), nullable=False, index=True)
    reported_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reason = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="open", nullable=False)  # open, investigating, resolved, closed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    exchange = relationship("ExchangeRequest", back_populates="disputes")
    reported_by = relationship("User")

    def __repr__(self):
        return f"<ExchangeDispute(id={self.id}, exchange_id={self.exchange_id}, status={self.status})>"
