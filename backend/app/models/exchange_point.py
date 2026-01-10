"""
Physical exchange point/location models.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float
from sqlalchemy.orm import relationship

from app.core.database import Base


class ExchangePoint(Base):
    """Physical exchange point location model."""
    __tablename__ = "exchange_points"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    address = Column(String(500), nullable=False)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    contact_phone = Column(String(50), nullable=True)
    contact_email = Column(String(255), nullable=True)
    operating_hours = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<ExchangePoint(id={self.id}, name={self.name})>"
