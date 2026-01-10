"""
Pydantic schemas for physical exchange points/locations.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class ExchangePointCreate(BaseModel):
    """Create exchange point request schema."""
    name: str
    description: Optional[str] = None
    address: str
    latitude: float
    longitude: float
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    operating_hours: Optional[str] = None
    is_active: bool = True


class ExchangePointUpdate(BaseModel):
    """Update exchange point request schema."""
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    operating_hours: Optional[str] = None
    is_active: Optional[bool] = None


class ExchangePointResponse(BaseModel):
    """Exchange point response schema."""
    id: int
    name: str
    description: Optional[str] = None
    address: str
    latitude: float
    longitude: float
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    operating_hours: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExchangePointListResponse(BaseModel):
    """Paginated exchange point list response."""
    points: List[ExchangePointResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ExchangePointSearchFilters(BaseModel):
    """Exchange point search and filter parameters."""
    query: Optional[str] = None
    latitude: Optional[float] = None  # For proximity search
    longitude: Optional[float] = None  # For proximity search
    radius_km: Optional[float] = None  # Search radius in kilometers
    is_active: Optional[bool] = True
    page: int = 1
    page_size: int = 50
