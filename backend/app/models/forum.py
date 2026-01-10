"""
Forum and discussion models.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class ForumPost(Base):
    """Forum post model."""
    __tablename__ = "forum_posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Null if anonymous
    is_anonymous = Column(Boolean, default=False, nullable=False)
    tags = Column(JSON, default=[], nullable=False)  # JSON array for compatibility with both SQLite and PostgreSQL
    upvotes = Column(Integer, default=0, nullable=False)
    downvotes = Column(Integer, default=0, nullable=False)
    reply_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    author = relationship("User", back_populates="forum_posts")
    replies = relationship("ForumReply", back_populates="post", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ForumPost(id={self.id}, title={self.title})>"


class ForumReply(Base):
    """Forum reply model."""
    __tablename__ = "forum_replies"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("forum_posts.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Null if anonymous
    is_anonymous = Column(Boolean, default=False, nullable=False)
    upvotes = Column(Integer, default=0, nullable=False)
    downvotes = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    post = relationship("ForumPost", back_populates="replies")
    author = relationship("User", back_populates="forum_replies")

    def __repr__(self):
        return f"<ForumReply(id={self.id}, post_id={self.post_id})>"


class ForumVote(Base):
    """Forum vote model for posts and replies."""
    __tablename__ = "forum_votes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    post_id = Column(Integer, ForeignKey("forum_posts.id"), nullable=True, index=True)
    reply_id = Column(Integer, ForeignKey("forum_replies.id"), nullable=True, index=True)
    vote_type = Column(String(10), nullable=False)  # upvote or downvote
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User")
    post = relationship("ForumPost")
    reply = relationship("ForumReply")

    def __repr__(self):
        return f"<ForumVote(id={self.id}, vote_type={self.vote_type})>"
