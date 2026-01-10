"""
Points transaction model.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class PointTransactionType(str, enum.Enum):
    """Point transaction type enumeration."""
    EARNED = "earned"
    REDEEMED = "redeemed"
    PURCHASED = "purchased"
    REFUNDED = "refunded"
    BONUS = "bonus"


class PointTransaction(Base):
    """Point transaction model."""
    __tablename__ = "point_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Integer, nullable=False)  # Positive for earned/purchased, negative for redeemed
    transaction_type = Column(SQLEnum(PointTransactionType), nullable=False, index=True)
    description = Column(Text, nullable=False)
    related_exchange_id = Column(Integer, ForeignKey("exchange_requests.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="point_transactions")
    related_exchange = relationship("ExchangeRequest")

    def __repr__(self):
        return f"<PointTransaction(id={self.id}, user_id={self.user_id}, amount={self.amount})>"
