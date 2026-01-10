"""
Pydantic schemas for forum and discussion management.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class ForumPostCreate(BaseModel):
    """Create forum post request schema."""
    title: str
    content: str
    is_anonymous: bool = False
    tags: Optional[List[str]] = []


class ForumPostUpdate(BaseModel):
    """Update forum post request schema."""
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None


class ForumPostResponse(BaseModel):
    """Forum post response schema."""
    id: int
    title: str
    content: str
    author_id: Optional[int] = None  # None if anonymous
    author_username: Optional[str] = None  # None if anonymous
    is_anonymous: bool
    tags: List[str] = []
    upvotes: int = 0
    downvotes: int = 0
    reply_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ForumReplyCreate(BaseModel):
    """Create forum reply request schema."""
    content: str
    is_anonymous: bool = False


class ForumReplyResponse(BaseModel):
    """Forum reply response schema."""
    id: int
    post_id: int
    content: str
    author_id: Optional[int] = None
    author_username: Optional[str] = None
    is_anonymous: bool
    upvotes: int = 0
    downvotes: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ForumPostListResponse(BaseModel):
    """Paginated forum post list response."""
    posts: List[ForumPostResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ForumSearchFilters(BaseModel):
    """Forum search and filter parameters."""
    query: Optional[str] = None
    tags: Optional[List[str]] = None
    author_id: Optional[int] = None
    sort_by: str = "created_at"  # created_at, upvotes, replies
    order: str = "desc"  # asc, desc
    page: int = 1
    page_size: int = 20
