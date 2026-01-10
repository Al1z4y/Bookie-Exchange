"""
Wishlist availability alerts service.
Notifies users when books in their wishlist become available.
"""
from sqlalchemy.orm import Session
from app.models.book import Book, Wishlist
from app.models.user import User
from app.models.message import Message


def check_and_send_wishlist_alerts(book_id: int, db: Session):
    """
    Check if book is in any user's wishlist and send alerts.
    Called when a book becomes available.
    
    Args:
        book_id: Book ID that became available
        db: Database session
    """
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book or not book.is_available:
        return
    
    # Get all users who have this book in their wishlist
    wishlist_items = db.query(Wishlist).filter(Wishlist.book_id == book_id).all()
    
    for wishlist_item in wishlist_items:
        user = db.query(User).filter(User.id == wishlist_item.user_id).first()
        if user:
            # Create alert message (use book owner as sender for now, or create a system user)
            # In production, you might want to create a system user account
            sender_id = book.owner_id if book.owner_id else 1  # Use book owner or default system user
            
            alert_message = Message(
                sender_id=sender_id,
                recipient_id=user.id,
                subject=f"Book Available: {book.title}",
                content=f"The book '{book.title}' by {book.author} that you added to your wishlist is now available!",
                is_read=False,
            )
            db.add(alert_message)
    
    if wishlist_items:
        db.commit()
