"""
Payment and point purchase models.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class PaymentMethod(str, enum.Enum):
    """Payment method enumeration."""
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PAYPAL = "paypal"
    STRIPE = "stripe"


class PaymentStatus(str, enum.Enum):
    """Payment status enumeration."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentTransaction(Base):
    """Payment transaction model."""
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    points_amount = Column(Integer, nullable=False)
    amount_usd = Column(Float, nullable=False)
    payment_method = Column(SQLEnum(PaymentMethod), nullable=False)
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False, index=True)
    transaction_id = Column(String(255), unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="payment_transactions")

    def __repr__(self):
        return f"<PaymentTransaction(id={self.id}, user_id={self.user_id}, status={self.status})>"
