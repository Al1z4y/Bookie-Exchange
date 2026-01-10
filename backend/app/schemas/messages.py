"""
Pydantic schemas for in-app messaging.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class MessageCreate(BaseModel):
    """Create message request schema."""
    recipient_id: int
    subject: Optional[str] = None
    content: str


class MessageResponse(BaseModel):
    """Message response schema."""
    id: int
    sender_id: int
    sender_username: str
    recipient_id: int
    recipient_username: str
    subject: Optional[str] = None
    content: str
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MessageListResponse(BaseModel):
    """Paginated message list response."""
    messages: List[MessageResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    unread_count: int


class ConversationResponse(BaseModel):
    """Conversation thread response schema."""
    other_user_id: int
    other_username: str
    last_message: MessageResponse
    unread_count: int
    messages: List[MessageResponse] = []
