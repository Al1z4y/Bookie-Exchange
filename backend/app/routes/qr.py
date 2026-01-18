"""
QR code routes for book scanning and history management.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from datetime import datetime, date

from app.core.database import get_db
from app.routes.auth import get_current_user
from app.models.book import Book, BookHistory
from app.models.user import User
from app.schemas.books import (
    BookResponse,
    QRCodeScanResponse,
    BookHistoryEntry,
    BookHistoryCreate,
)

router = APIRouter(prefix="/qr", tags=["qr"])


@router.get("/{qr_code_id}", response_model=QRCodeScanResponse)
async def scan_qr_code(
    qr_code_id: str,
    db: Session = Depends(get_db)
):
    """
    Scan QR code and get book details with reading history.
    
    - **qr_code_id**: QR code ID (format: book_{12_char_hex})
    
    Returns book information and complete reading history timeline.
    For now, includes mock history data if no real history exists.
    """
    # Find book by qr_code_id
    book = db.query(Book).options(joinedload(Book.owner)).filter(
        Book.qr_code_id == qr_code_id
    ).first()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found with this QR code ID. Please check the QR code and try again."
        )
    
    # Get book history with eager loading to avoid N+1 queries
    try:
        history_entries = db.query(BookHistory).options(
            joinedload(BookHistory.user)
        ).filter(
            BookHistory.book_id == book.id
        ).order_by(BookHistory.created_at.asc()).all()
    except Exception:
        history_entries = []
    
    # Format history entries
    history = []
    for entry in history_entries:
        username = None
        reader_name = entry.reader_name
        
        if entry.user_id:
            if entry.user:
                username = entry.user.username
                if not reader_name:
                    reader_name = entry.user.username
            else:
                username = "Anonymous"
                if not reader_name:
                    reader_name = "Anonymous"
        elif not reader_name:
            reader_name = "Anonymous"
        
        history.append(BookHistoryEntry(
            id=entry.id,
            action=entry.action,
            reader_name=reader_name,
            reading_start_date=entry.reading_start_date,
            reading_end_date=entry.reading_end_date,
            cities_read=entry.cities_read,
            reading_notes=entry.reading_notes,
            tips_for_next_reader=entry.tips_for_next_reader,
            notes=entry.notes,
            city=entry.city,
            reading_duration_days=entry.reading_duration_days,
            user_id=entry.user_id,
            username=username,
            created_at=entry.created_at,
        ))
    
    # If no history exists, add mock history data for demonstration
    if len(history) == 0:
        from datetime import timedelta
        mock_history = [
            BookHistoryEntry(
                id=0,
                action="created",
                reader_name=book.owner.username if book.owner else "Book Owner",
                reading_start_date=None,
                reading_end_date=None,
                cities_read=None,
                reading_notes=f"Book '{book.title}' by {book.author} was listed",
                tips_for_next_reader=None,
                notes=f"Book '{book.title}' by {book.author} was listed",
                city=None,
                reading_duration_days=None,
                user_id=book.owner_id if book.owner else None,
                username=book.owner.username if book.owner else None,
                created_at=book.created_at,
            ),
            BookHistoryEntry(
                id=-1,
                action="read",
                reader_name="Sample Reader",
                reading_start_date=(datetime.now().date() - timedelta(days=30)),
                reading_end_date=(datetime.now().date() - timedelta(days=15)),
                cities_read="New York, Boston",
                reading_notes="A captivating read! The character development was excellent.",
                tips_for_next_reader="Pay attention to the symbolism in Chapter 5 - it's brilliant!",
                notes="A captivating read! The character development was excellent.",
                city="New York",
                reading_duration_days=15,
                user_id=None,
                username="Sample Reader",
                created_at=datetime.now() - timedelta(days=10),
            ),
        ]
        history = mock_history
    
    # Get current holder info
    current_holder = None
    if book.owner:
        current_holder = {
            "id": book.owner.id,
            "username": book.owner.username,
            "email": book.owner.email if hasattr(book.owner, 'email') else None,
        }
    
    # Convert book to response format
    from app.schemas.books import BookCondition
    condition_enum = BookCondition(book.condition)
    owner_username = book.owner.username if book.owner else "Unknown"
    
    book_response = BookResponse(
        id=book.id,
        permanent_id=getattr(book, 'permanent_id', None),
        qr_code_id=getattr(book, 'qr_code_id', None),
        title=book.title,
        author=book.author,
        condition=condition_enum,
        description=book.description,
        image_urls=book.image_urls if isinstance(book.image_urls, list) else [],
        location=book.location,
        point_value=book.point_value,
        is_available=book.is_available,
        qr_code=book.qr_code,
        owner_id=book.owner_id,
        owner_username=owner_username,
        created_at=book.created_at,
        updated_at=book.updated_at,
    )
    
    return QRCodeScanResponse(
        book=book_response,
        history=history,
        current_holder=current_holder,
    )


@router.post("/{qr_code_id}/add-history", response_model=BookHistoryEntry, status_code=status.HTTP_201_CREATED)
async def add_qr_history(
    qr_code_id: str,
    history_data: BookHistoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a new entry to book history via QR code ID.
    
    - **qr_code_id**: QR code ID (format: book_{12_char_hex})
    - **reader_name**: Optional reader name (defaults to current user's username)
    - **reading_start_date**: Optional start date
    - **reading_end_date**: Optional end date
    - **cities_read**: Optional comma-separated list of cities
    - **reading_notes**: Optional general reading notes
    - **tips_for_next_reader**: Optional tips for next readers
    - **action**: Action type (default: "read")
    
    Requires authentication. History is append-only and persists even if user account is deleted.
    """
    # Find book by qr_code_id
    book = db.query(Book).filter(Book.qr_code_id == qr_code_id).first()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found with this QR code ID"
        )
    
    # Use current user's username as reader_name if not provided
    reader_name = history_data.reader_name or current_user.username
    
    # Calculate reading duration if both dates provided
    reading_duration_days = None
    if history_data.reading_start_date and history_data.reading_end_date:
        delta = history_data.reading_end_date - history_data.reading_start_date
        reading_duration_days = delta.days
    
    # Create history entry (append-only)
    history_entry = BookHistory(
        book_id=book.id,
        user_id=current_user.id,  # Store user_id but history persists if user deleted
        reader_name=reader_name,  # Store name to survive account deletion
        action=history_data.action,
        reading_start_date=history_data.reading_start_date,
        reading_end_date=history_data.reading_end_date,
        cities_read=history_data.cities_read,
        reading_notes=history_data.reading_notes,
        tips_for_next_reader=history_data.tips_for_next_reader,
        # Legacy fields for backward compatibility
        notes=history_data.notes or history_data.reading_notes,
        city=history_data.city or (history_data.cities_read.split(',')[0].strip() if history_data.cities_read else None),
        reading_duration_days=history_data.reading_duration_days or reading_duration_days,
    )
    
    db.add(history_entry)
    db.commit()
    db.refresh(history_entry)
    
    # Return formatted history entry
    return BookHistoryEntry(
        id=history_entry.id,
        action=history_entry.action,
        reader_name=history_entry.reader_name,
        reading_start_date=history_entry.reading_start_date,
        reading_end_date=history_entry.reading_end_date,
        cities_read=history_entry.cities_read,
        reading_notes=history_entry.reading_notes,
        tips_for_next_reader=history_entry.tips_for_next_reader,
        notes=history_entry.notes,
        city=history_entry.city,
        reading_duration_days=history_entry.reading_duration_days,
        user_id=history_entry.user_id,
        username=current_user.username,
        created_at=history_entry.created_at,
    )
