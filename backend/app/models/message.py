"""
In-app messaging models.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class Message(Base):
    """Message model for in-app messaging."""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subject = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    read_at = Column(DateTime, nullable=True)

    # Relationships
    sender = relationship("User", back_populates="messages_sent", foreign_keys=[sender_id])
    recipient = relationship("User", back_populates="messages_received", foreign_keys=[recipient_id])

    def __repr__(self):
        return f"<Message(id={self.id}, sender_id={self.sender_id}, recipient_id={self.recipient_id})>"
