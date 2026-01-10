"""
Pydantic schemas for points management.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from enum import Enum


class PointTransactionType(str, Enum):
    """Point transaction type enumeration."""
    EARNED = "earned"  # Earned from listing/book exchange
    REDEEMED = "redeemed"  # Spent on book exchange
    PURCHASED = "purchased"  # Bought with money
    REFUNDED = "refunded"  # Refunded from cancelled exchange
    BONUS = "bonus"  # Bonus points


class PointTransactionResponse(BaseModel):
    """Point transaction response schema."""
    id: int
    user_id: int
    amount: int  # Positive for earned/purchased, negative for redeemed
    transaction_type: PointTransactionType
    description: str
    related_exchange_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PointsBalanceResponse(BaseModel):
    """User points balance response schema."""
    user_id: int
    balance: int
    total_earned: int
    total_redeemed: int
    total_purchased: int


class PointTransactionListResponse(BaseModel):
    """Paginated point transaction list response."""
    transactions: List[PointTransactionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    current_balance: int
