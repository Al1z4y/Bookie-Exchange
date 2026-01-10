"""
Pydantic schemas for book management.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from enum import Enum


class BookCondition(str, Enum):
    """Book condition enumeration."""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"


class BookCreate(BaseModel):
    """Book creation request schema."""
    title: str
    author: str
    condition: BookCondition
    description: Optional[str] = None
    image_urls: Optional[List[str]] = []
    location: Optional[str] = None
    point_value: Optional[int] = None  # Auto-calculated if not provided


class BookUpdate(BaseModel):
    """Book update request schema."""
    title: Optional[str] = None
    author: Optional[str] = None
    condition: Optional[BookCondition] = None
    description: Optional[str] = None
    image_urls: Optional[List[str]] = None
    location: Optional[str] = None
    is_available: Optional[bool] = None


class BookResponse(BaseModel):
    """Book response schema."""
    id: int
    permanent_id: Optional[str] = None  # Permanent UUID that persists across ownership transfers (nullable for migration)
    title: str
    author: str
    condition: BookCondition
    description: Optional[str] = None
    image_urls: List[str] = []
    location: Optional[str] = None
    point_value: int
    is_available: bool
    qr_code: str  # QR code string (encodes permanent_id)
    owner_id: int
    owner_username: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BookListResponse(BaseModel):
    """Paginated book list response."""
    books: List[BookResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class BookSearchFilters(BaseModel):
    """Book search and filter parameters."""
    query: Optional[str] = None
    author: Optional[str] = None
    condition: Optional[BookCondition] = None
    min_points: Optional[int] = None
    max_points: Optional[int] = None
    location: Optional[str] = None
    owner_id: Optional[int] = None
    is_available: Optional[bool] = True
    page: int = 1
    page_size: int = 20


class BookHistoryEntry(BaseModel):
    """Book history entry schema."""
    id: int
    action: str
    notes: Optional[str] = None
    city: Optional[str] = None
    reading_duration_days: Optional[int] = None
    user_id: Optional[int] = None
    username: Optional[str] = None  # Can be None if user deleted
    created_at: datetime

    class Config:
        from_attributes = True


class BookHistoryCreate(BaseModel):
    """Create book history entry schema."""
    notes: Optional[str] = None
    city: Optional[str] = None
    reading_duration_days: Optional[int] = None
    action: str = "read"  # Default action is "read"


class QRCodeScanResponse(BaseModel):
    """QR code scan response schema."""
    book: BookResponse
    history: List[BookHistoryEntry]  # Book history entries
    current_holder: Optional[dict] = None  # Current book holder info
