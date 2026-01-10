"""
Database models module.
Import all models here for Alembic and easy access.
"""
from app.models.user import User
from app.models.book import Book, BookHistory, Wishlist
from app.models.exchange import ExchangeRequest, ExchangeDispute, ExchangeStatus
from app.models.payment import PaymentTransaction, PaymentMethod, PaymentStatus
from app.models.points import PointTransaction, PointTransactionType
from app.models.forum import ForumPost, ForumReply, ForumVote
from app.models.message import Message
from app.models.exchange_point import ExchangePoint

__all__ = [
    "User",
    "Book",
    "BookHistory",
    "Wishlist",
    "ExchangeRequest",
    "ExchangeDispute",
    "ExchangeStatus",
    "PaymentTransaction",
    "PaymentMethod",
    "PaymentStatus",
    "PointTransaction",
    "PointTransactionType",
    "ForumPost",
    "ForumReply",
    "ForumVote",
    "Message",
    "ExchangePoint",
]