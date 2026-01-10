"""
Pydantic schemas for payment and point purchases.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from enum import Enum


class PaymentMethod(str, Enum):
    """Payment method enumeration."""
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PAYPAL = "paypal"
    STRIPE = "stripe"


class PaymentStatus(str, Enum):
    """Payment status enumeration."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class PointPurchaseCreate(BaseModel):
    """Create point purchase request schema."""
    points_amount: int
    payment_method: PaymentMethod
    amount_usd: float  # Amount in USD


class PointPurchaseResponse(BaseModel):
    """Point purchase response schema."""
    id: int
    user_id: int
    points_amount: int
    amount_usd: float
    payment_method: PaymentMethod
    status: PaymentStatus
    transaction_id: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaymentWebhook(BaseModel):
    """Payment webhook schema (for payment gateway callbacks)."""
    transaction_id: str
    status: PaymentStatus
    amount: float
    metadata: Optional[dict] = None
