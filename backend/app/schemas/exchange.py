"""
Pydantic schemas for book exchange system.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from enum import Enum


class ExchangeStatus(str, Enum):
    """Exchange request status enumeration."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


class ExchangeRequestCreate(BaseModel):
    """Create exchange request schema."""
    book_id: int
    message: Optional[str] = None


class ExchangeRequestResponse(BaseModel):
    """Exchange request response schema."""
    id: int
    book_id: int
    book_title: str
    requester_id: int
    requester_username: str
    owner_id: int
    owner_username: str
    status: ExchangeStatus
    points_cost: int
    message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ExchangeApproval(BaseModel):
    """Exchange approval/rejection schema."""
    approve: bool
    message: Optional[str] = None


class ExchangeDisputeCreate(BaseModel):
    """Create exchange dispute schema."""
    exchange_id: int
    reason: str
    description: str


class ExchangeDisputeResponse(BaseModel):
    """Exchange dispute response schema."""
    id: int
    exchange_id: int
    reported_by_id: int
    reason: str
    description: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True
