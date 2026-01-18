"""
Book management routes.
"""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.routes.auth import get_current_user
from app.models.book import Book, BookHistory, Wishlist
from app.models.user import User
from app.schemas.books import (
    BookCreate,
    BookUpdate,
    BookResponse,
    BookListResponse,
    BookSearchFilters,
    QRCodeScanResponse,
    BookHistoryEntry,
    BookHistoryCreate,
)

router = APIRouter(prefix="/books", tags=["books"])


def calculate_point_value(condition: str) -> int:
    """Calculate point value based on book condition."""
    condition_points = {
        "excellent": 15,
        "good": 12,
        "fair": 8,
        "poor": 5,
    }
    return condition_points.get(condition.lower(), 10)


def generate_qr_code(permanent_id: str, base_url: str = None) -> str:
    """
    Generate a QR code string for a book.
    
    The QR code encodes either:
    1. A URL to the book history page: /books/{permanent_id}/history
    2. Or just the permanent_id UUID for direct lookup
    
    Args:
        permanent_id: The permanent UUID of the book
        base_url: Optional base URL for the application (if provided, creates full URL)
    
    Returns:
        QR code string that can be scanned
    """
    if base_url:
        # Encode as full URL
        qr_data = f"{base_url}/books/{permanent_id}/history"
    else:
        # Encode as UUID (can be used to lookup book)
        qr_data = permanent_id
    
    return qr_data


@router.post("", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
async def create_book(
    book_data: BookCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new book listing.
    
    - **title**: Book title
    - **author**: Book author
    - **condition**: Book condition (excellent, good, fair, poor)
    - **description**: Optional book description
    - **image_urls**: List of image URLs
    - **location**: Optional location
    - **point_value**: Optional point value (auto-calculated if not provided)
    
    Requires authentication. User earns 10 points for listing a book.
    Each book has only one digital identity - prevents duplicate listings.
    """
    from sqlalchemy import func
    
    # Check if the same user already has a book with the same title and author
    # This ensures each book has only one digital identity per user
    existing_book = db.query(Book).filter(
        Book.owner_id == current_user.id,
        func.lower(Book.title) == func.lower(book_data.title.strip()),
        func.lower(Book.author) == func.lower(book_data.author.strip())
    ).first()
    
    if existing_book:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You have already listed '{book_data.title}' by {book_data.author}. Each book can only have one digital identity."
        )
    
    # Calculate point value using AI-based valuation (condition, demand, rarity)
    from app.services.book_valuation import calculate_book_value, get_openai_pricing
    
    # Try OpenAI pricing first for intelligent base value
    ai_base_points = get_openai_pricing(
        book_data.title.strip(),
        book_data.author.strip(),
        book_data.condition.value
    )
    
    # Get base point value from condition (fallback if AI fails)
    base_point_value = calculate_point_value(book_data.condition.value)
    
    # For new books, demand and rarity will be minimal initially
    point_value = book_data.point_value
    if point_value is None:
        # Use AI pricing if available, otherwise use condition-based default
        if ai_base_points is not None:
            point_value = ai_base_points
        else:
            point_value = base_point_value
    
    # Generate permanent UUID for this book (persists across ownership transfers)
    permanent_id = str(uuid.uuid4())
    
    # Generate unique QR code ID (format: book_{12_char_hex})
    qr_code_id = f"book_{uuid.uuid4().hex[:12]}"
    
    # Generate QR code string (encodes the qr_code_id)
    qr_code = generate_qr_code(permanent_id)
    
    # Create book in database
    new_book = Book(
        permanent_id=permanent_id,  # Permanent digital identity (required for new books)
        qr_code_id=qr_code_id,  # Short QR code ID for easy scanning
        title=book_data.title.strip(),
        author=book_data.author.strip(),
        condition=book_data.condition.value,
        description=book_data.description.strip() if book_data.description else None,
        image_urls=book_data.image_urls or [],
        location=book_data.location.strip() if book_data.location else None,
        point_value=point_value,
        qr_code=qr_code,  # QR code string (encodes permanent_id)
        owner_id=current_user.id,
        is_available=True,
    )
    
    db.add(new_book)
    db.flush()  # Flush to get the book ID without committing
    
    # Create book history entry with reader name
    history_entry = BookHistory(
        book_id=new_book.id,
        user_id=current_user.id,
        reader_name=current_user.username,  # Store name to survive account deletion
        action="created",
        notes=f"Book '{new_book.title}' by {new_book.author} listed by {current_user.username}",
    )
    db.add(history_entry)
    
    # Award 10 points to user for listing a book
    current_user.points_balance += 10
    
    # Create point transaction record
    from app.models.points import PointTransaction, PointTransactionType
    point_transaction = PointTransaction(
        user_id=current_user.id,
        amount=10,
        transaction_type=PointTransactionType.EARNED,
        description=f"Earned 10 points for listing book: {new_book.title}",
    )
    db.add(point_transaction)
    
    db.commit()
    db.refresh(new_book)
    
    # Check for wishlist alerts (book is now available)
    from app.services.wishlist_alerts import check_and_send_wishlist_alerts
    check_and_send_wishlist_alerts(new_book.id, db)
    
    # Update book value using AI-based calculation (now that book exists)
    from app.services.book_valuation import update_book_value
    updated_value = update_book_value(new_book.id, db)
    new_book.point_value = updated_value
    db.commit()
    db.refresh(new_book)
    
    # Return book response with owner username
    # Convert condition string to enum
    from app.schemas.books import BookCondition
    condition_enum = BookCondition(new_book.condition)
    
    return BookResponse(
        id=new_book.id,
        permanent_id=getattr(new_book, 'permanent_id', None),  # Handle missing column gracefully
        qr_code_id=getattr(new_book, 'qr_code_id', None),  # Short QR code ID
        title=new_book.title,
        author=new_book.author,
        condition=condition_enum,
        description=new_book.description,
        image_urls=new_book.image_urls if isinstance(new_book.image_urls, list) else [],
        location=new_book.location,
        point_value=new_book.point_value,
        is_available=new_book.is_available,
        qr_code=new_book.qr_code,
        owner_id=new_book.owner_id,
        owner_username=current_user.username,
        created_at=new_book.created_at,
        updated_at=new_book.updated_at,
    )


@router.get("", response_model=BookListResponse)
async def list_books(
    query: str = Query(None, description="Search query"),
    author: str = Query(None, description="Filter by author"),
    condition: str = Query(None, description="Filter by condition"),
    min_points: int = Query(None, description="Minimum point value"),
    max_points: int = Query(None, description="Maximum point value"),
    location: str = Query(None, description="Filter by location"),
    is_available: bool = Query(True, description="Filter by availability"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db)
):
    """
    List books with search and filter options.
    
    Supports pagination, search by title/author, and filtering by condition, points, location, and availability.
    """
    from sqlalchemy import or_, func
    from sqlalchemy.orm import joinedload
    
    # Build query with eager loading to prevent N+1 queries
    books_query = db.query(Book).options(joinedload(Book.owner))
    
    # Apply filters
    if query:
        search_term = f"%{query.lower()}%"
        books_query = books_query.filter(
            or_(
                func.lower(Book.title).like(search_term),
                func.lower(Book.author).like(search_term),
                func.lower(Book.description).like(search_term) if Book.description else False
            )
        )
    
    if author:
        books_query = books_query.filter(func.lower(Book.author).like(f"%{author.lower()}%"))
    
    if condition:
        books_query = books_query.filter(Book.condition == condition.lower())
    
    if min_points is not None:
        books_query = books_query.filter(Book.point_value >= min_points)
    
    if max_points is not None:
        books_query = books_query.filter(Book.point_value <= max_points)
    
    if location:
        books_query = books_query.filter(func.lower(Book.location).like(f"%{location.lower()}%"))
    
    if is_available is not None:
        books_query = books_query.filter(Book.is_available == is_available)
    
    # Get total count (before pagination)
    total = books_query.count()
    
    # Apply pagination
    skip = (page - 1) * page_size
    books = books_query.offset(skip).limit(page_size).all()
    
    # Convert to response format
    from app.schemas.books import BookCondition
    book_responses = []
    for book in books:
        condition_enum = BookCondition(book.condition)
        owner_username = book.owner.username if book.owner else "Unknown"
        
        book_responses.append(BookResponse(
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
        ))
    
    total_pages = (total + page_size - 1) // page_size
    
    return BookListResponse(
        books=book_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/my-books", response_model=List[BookResponse])
async def get_my_books(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's books.
    
    Returns all books owned by the authenticated user.
    Requires authentication.
    """
    from sqlalchemy.orm import joinedload
    
    books = db.query(Book).options(joinedload(Book.owner)).filter(
        Book.owner_id == current_user.id
    ).order_by(Book.created_at.desc()).all()
    
    from app.schemas.books import BookCondition
    book_responses = []
    for book in books:
        condition_enum = BookCondition(book.condition)
        owner_username = book.owner.username if book.owner else "Unknown"
        
        book_responses.append(BookResponse(
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
        ))
    
    return book_responses


@router.get("/{book_id}", response_model=BookResponse)
async def get_book(
    book_id: int,
    db: Session = Depends(get_db)
):
    """
    Get book details by ID.
    
    - **book_id**: Book ID
    """
    book = db.query(Book).options(joinedload(Book.owner)).filter(Book.id == book_id).first()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    from app.schemas.books import BookCondition
    condition_enum = BookCondition(book.condition)
    owner_username = book.owner.username if book.owner else "Unknown"
    
    return BookResponse(
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


@router.put("/{book_id}", response_model=BookResponse)
async def update_book(
    book_id: int,
    book_update: BookUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update book listing.
    
    - **book_id**: Book ID
    - Only the book owner can update their listing
    
    Requires authentication.
    """
    # TODO: Implement book update
    # - Verify ownership
    # - Update book fields
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Update book endpoint not yet implemented"
    )


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(
    book_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete book listing.
    
    - **book_id**: Book ID
    - Only the book owner can delete their listing
    
    Requires authentication.
    """
    # Find the book
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Verify ownership
    if book.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own books"
        )
    
    # Delete the book (cascade will handle related records)
    db.delete(book)
    db.commit()
    
    return None


@router.get("/qr/{qr_code}", response_model=QRCodeScanResponse)
async def scan_qr_code(
    qr_code: str,
    db: Session = Depends(get_db)
):
    """
    Scan QR code and get book details with complete reading history.
    
    Supports multiple QR code formats:
    - UUID (permanent_id): Direct lookup by permanent book ID
    - URL format: /books/{permanent_id}/history - extracts UUID from URL
    - Legacy qr_code format: Original QR code string
    
    - **qr_code**: QR code string from book (can be UUID, URL, or legacy format)
    
    Returns book information and complete reading history timeline.
    History persists even if user accounts are deleted.
    """
    book = None
    
    # Try to extract UUID from URL format: /books/{uuid}/history
    if "/books/" in qr_code and "/history" in qr_code:
        try:
            # Extract UUID from URL
            uuid_part = qr_code.split("/books/")[1].split("/history")[0]
            # Check if permanent_id column exists before querying
            if hasattr(Book, 'permanent_id'):
                book = db.query(Book).options(joinedload(Book.owner)).filter(Book.permanent_id == uuid_part).first()
        except (IndexError, ValueError, AttributeError):
            pass
    
    # If not found, try as direct UUID (permanent_id)
    if not book and hasattr(Book, 'permanent_id'):
        try:
            book = db.query(Book).options(joinedload(Book.owner)).filter(Book.permanent_id == qr_code).first()
        except Exception:
            pass
    
    # If still not found, try legacy qr_code format (for backward compatibility)
    if not book:
        book = db.query(Book).options(joinedload(Book.owner)).filter(Book.qr_code == qr_code).first()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found with this QR code. Please check the QR code and try again."
        )
    
    # Get book history with eager loading to avoid N+1 queries
    # History is append-only and persists across ownership transfers
    try:
        history_entries = db.query(BookHistory).options(
            joinedload(BookHistory.user)
        ).filter(
            BookHistory.book_id == book.id
        ).order_by(BookHistory.created_at.asc()).all()  # Chronological order (oldest first) for timeline
    except Exception as e:
        # Graceful error handling - if history query fails, return empty history
        history_entries = []
    
    # Format history (append-only, ordered chronologically)
    # History persists even if user accounts are deleted
    history = []
    for entry in history_entries:
        # Handle deleted users gracefully - use reader_name if available, otherwise show "Anonymous"
        username = None
        reader_name = entry.reader_name
        
        if entry.user_id:
            if entry.user:
                username = entry.user.username
                # Use username as reader_name if reader_name is not set
                if not reader_name:
                    reader_name = entry.user.username
            else:
                username = "Anonymous"  # User account was deleted but history preserved
                if not reader_name:
                    reader_name = "Anonymous"
        elif not reader_name:
            reader_name = "Anonymous"
        
        history.append(BookHistoryEntry(
            id=entry.id,
            action=entry.action,
            reader_name=reader_name,  # Preserved name even if user deleted
            reading_start_date=entry.reading_start_date,
            reading_end_date=entry.reading_end_date,
            cities_read=entry.cities_read,
            reading_notes=entry.reading_notes,
            tips_for_next_reader=entry.tips_for_next_reader,
            notes=entry.notes,  # Legacy field
            city=entry.city,  # Legacy field
            reading_duration_days=entry.reading_duration_days,  # Legacy field
            user_id=entry.user_id,  # Preserved even if user deleted
            username=username,
            created_at=entry.created_at,
        ))
    
    # Get current holder info (may change with ownership transfers, but book's permanent_id persists)
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
        history=history,  # Complete reading timeline
        current_holder=current_holder,
    )


@router.post("/{book_id}/history", response_model=BookHistoryEntry, status_code=status.HTTP_201_CREATED)
async def add_book_history(
    book_id: int,
    history_data: BookHistoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a new entry to book history.
    
    - **book_id**: Book ID (can also use permanent_id via /books/by-uuid/{permanent_id}/history)
    - **reader_name**: Optional reader name (defaults to current user's username)
    - **reading_start_date**: Optional start date
    - **reading_end_date**: Optional end date
    - **cities_read**: Optional comma-separated list of cities
    - **reading_notes**: Optional general reading notes
    - **tips_for_next_reader**: Optional tips for next readers
    - **action**: Action type (default: "read")
    
    Requires authentication. History is append-only and persists even if user account is deleted.
    """
    # Find the book
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
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


@router.get("/by-uuid/{permanent_id}", response_model=BookResponse)
async def get_book_by_uuid(
    permanent_id: str,
    db: Session = Depends(get_db)
):
    """
    Get book by permanent UUID.
    
    - **permanent_id**: Permanent book UUID (persists across ownership transfers)
    """
    if not hasattr(Book, 'permanent_id'):
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Permanent ID feature not available"
        )
    
    book = db.query(Book).options(joinedload(Book.owner)).filter(Book.permanent_id == permanent_id).first()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found with this permanent ID"
        )
    
    from app.schemas.books import BookCondition
    condition_enum = BookCondition(book.condition)
    owner_username = book.owner.username if book.owner else "Unknown"
    
    return BookResponse(
        id=book.id,
        permanent_id=book.permanent_id,
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


@router.post("/by-uuid/{permanent_id}/history", response_model=BookHistoryEntry, status_code=status.HTTP_201_CREATED)
async def add_book_history_by_uuid(
    permanent_id: str,
    history_data: BookHistoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add book history entry using permanent UUID.
    
    Same as /{book_id}/history but uses permanent_id instead of book_id.
    """
    if not hasattr(Book, 'permanent_id'):
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Permanent ID feature not available"
        )
    
    book = db.query(Book).filter(Book.permanent_id == permanent_id).first()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found with this permanent ID"
        )
    
    # Use the regular add_book_history logic
    return await add_book_history(book.id, history_data, current_user, db)


@router.post("/{book_id}/wishlist", status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    book_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a book to the current user's wishlist.
    
    - **book_id**: Book ID to add to wishlist
    
    Requires authentication.
    """
    # Check if book exists
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Check if already in wishlist
    existing = db.query(Wishlist).filter(
        Wishlist.user_id == current_user.id,
        Wishlist.book_id == book_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book is already in your wishlist"
        )
    
    # Add to wishlist
    wishlist_item = Wishlist(
        user_id=current_user.id,
        book_id=book_id
    )
    db.add(wishlist_item)
    db.commit()
    db.refresh(wishlist_item)
    
    return {"message": "Book added to wishlist", "book_id": book_id}


@router.delete("/{book_id}/wishlist", status_code=status.HTTP_200_OK)
async def remove_from_wishlist(
    book_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a book from the current user's wishlist.
    
    - **book_id**: Book ID to remove from wishlist
    
    Requires authentication.
    """
    # Find wishlist item
    wishlist_item = db.query(Wishlist).filter(
        Wishlist.user_id == current_user.id,
        Wishlist.book_id == book_id
    ).first()
    
    if not wishlist_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book is not in your wishlist"
        )
    
    # Remove from wishlist
    db.delete(wishlist_item)
    db.commit()
    
    return {"message": "Book removed from wishlist", "book_id": book_id}


@router.get("/wishlist/my-list", response_model=List[BookResponse])
async def get_my_wishlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's wishlist.
    
    Returns all books in the authenticated user's wishlist.
    Requires authentication.
    """
    from sqlalchemy.orm import joinedload
    
    # Get wishlist items with book and owner data
    wishlist_items = db.query(Wishlist).options(
        joinedload(Wishlist.book).joinedload(Book.owner)
    ).filter(
        Wishlist.user_id == current_user.id
    ).order_by(Wishlist.created_at.desc()).all()
    
    from app.schemas.books import BookCondition
    book_responses = []
    for item in wishlist_items:
        book = item.book
        if not book:
            continue
            
        condition_enum = BookCondition(book.condition)
        owner_username = book.owner.username if book.owner else "Unknown"
        
        book_responses.append(BookResponse(
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
        ))
    
    return book_responses


@router.post("/{book_id}/recalculate-value", response_model=BookResponse)
async def recalculate_book_value(
    book_id: int,
    use_ai: bool = Query(True, description="Use OpenAI for intelligent pricing"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Recalculate book's point value using AI and dynamic factors.
    
    - **book_id**: Book ID to recalculate
    - **use_ai**: Whether to use OpenAI pricing (default: True)
    
    Recalculates based on:
    - OpenAI intelligent pricing (title, author, condition)
    - Current demand (wishlist entries, pending requests)
    - Rarity (number of copies in system)
    
    Only the book owner can recalculate the value.
    Requires authentication.
    """
    # Find the book
    book = db.query(Book).options(joinedload(Book.owner)).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Verify ownership
    if book.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only recalculate values for your own books"
        )
    
    # Recalculate value using AI and dynamic factors
    from app.services.book_valuation import update_book_value
    
    new_value = update_book_value(book_id, db, use_ai=use_ai)
    
    # Refresh book to get updated value
    db.refresh(book)
    
    from app.schemas.books import BookCondition
    condition_enum = BookCondition(book.condition)
    owner_username = book.owner.username if book.owner else "Unknown"
    
    return BookResponse(
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
