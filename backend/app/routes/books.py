"""
Book management routes.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

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
    from app.services.book_valuation import calculate_book_value
    
    # Get base point value from condition
    base_point_value = calculate_point_value(book_data.condition.value)
    
    # Use AI-based calculation (will use base value, then adjust for demand/rarity)
    # For new books, demand and rarity will be minimal initially
    point_value = book_data.point_value
    if point_value is None:
        # Calculate using AI-based valuation
        # Since book doesn't exist yet, we'll use base value and update later
        point_value = base_point_value
    
    # Generate permanent UUID for this book (persists across ownership transfers)
    permanent_id = str(uuid.uuid4())
    
    # Generate QR code (encodes the permanent_id as URL or UUID)
    # Use permanent_id for QR code - can be scanned to lookup book
    qr_code = generate_qr_code(permanent_id)
    
    # Create book in database
    new_book = Book(
        permanent_id=permanent_id,  # Permanent digital identity (required for new books)
        title=book_data.title.strip(),
        author=book_data.author.strip(),
        condition=book_data.condition.value,
        description=book_data.description.strip() if book_data.description else None,
        image_urls=book_data.image_urls or [],
        location=book_data.location.strip() if book_data.location else None,
        point_value=point_value,
        qr_code=qr_code,  # QR code encoding the permanent_id
        owner_id=current_user.id,
        is_available=True,
    )
    
    db.add(new_book)
    db.flush()  # Flush to get the book ID without committing
    
    # Create book history entry
    history_entry = BookHistory(
        book_id=new_book.id,
        user_id=current_user.id,
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
    List and search books with filtering and pagination.
    
    - **query**: Search in title and author
    - **author**: Filter by author name
    - **condition**: Filter by book condition
    - **min_points/max_points**: Filter by point value range
    - **location**: Filter by location
    - **is_available**: Filter by availability
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    """
    from sqlalchemy import or_, and_
    from app.schemas.books import BookCondition
    
    # Start with base query
    books_query = db.query(Book).join(User, Book.owner_id == User.id)
    
    # Apply filters
    if is_available is not None:
        books_query = books_query.filter(Book.is_available == is_available)
    
    if query:
        search_term = f"%{query}%"
        books_query = books_query.filter(
            or_(
                Book.title.ilike(search_term),
                Book.author.ilike(search_term)
            )
        )
    
    if author:
        books_query = books_query.filter(Book.author.ilike(f"%{author}%"))
    
    if condition:
        books_query = books_query.filter(Book.condition == condition.lower())
    
    if min_points is not None:
        books_query = books_query.filter(Book.point_value >= min_points)
    
    if max_points is not None:
        books_query = books_query.filter(Book.point_value <= max_points)
    
    if location:
        books_query = books_query.filter(Book.location.ilike(f"%{location}%"))
    
    # Get total count before pagination
    total = books_query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    books = books_query.order_by(Book.created_at.desc()).offset(offset).limit(page_size).all()
    
    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size
    
    # Convert to response format
    book_responses = []
    for book in books:
        condition_enum = BookCondition(book.condition)
        book_responses.append(BookResponse(
            id=book.id,
            permanent_id=getattr(book, 'permanent_id', None),  # Handle missing column gracefully
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
            owner_username=book.owner.username,
            created_at=book.created_at,
            updated_at=book.updated_at,
        ))
    
    return BookListResponse(
        books=book_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/my-books", response_model=BookListResponse)
async def get_my_books(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's book listings.
    
    Requires authentication.
    """
    from app.schemas.books import BookCondition
    
    try:
        # Query books owned by current user
        books_query = db.query(Book).filter(Book.owner_id == current_user.id)
        
        # Get total count before pagination
        total = books_query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        books = books_query.order_by(Book.created_at.desc()).offset(offset).limit(page_size).all()
        
        # Calculate total pages
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        
        # Convert to response format
        book_responses = []
        for book in books:
            try:
                condition_enum = BookCondition(book.condition)
                book_responses.append(BookResponse(
                    id=book.id,
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
                    owner_username=current_user.username,
                    created_at=book.created_at,
                    updated_at=book.updated_at,
                ))
            except Exception as e:
                # Log error for individual book but continue processing others
                print(f"Error processing book {book.id}: {str(e)}")
                continue
        
        return BookListResponse(
            books=book_responses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    except Exception as e:
        print(f"Error in get_my_books: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch your books: {str(e)}"
        )


@router.get("/{book_id}", response_model=BookResponse)
async def get_book(
    book_id: int,
    db: Session = Depends(get_db)
):
    """
    Get book details by ID.
    
    - **book_id**: Book ID
    """
    from app.schemas.books import BookCondition
    
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    condition_enum = BookCondition(book.condition)
    return BookResponse(
        id=book.id,
        permanent_id=getattr(book, 'permanent_id', None),  # Handle missing column gracefully
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
        owner_username=book.owner.username,
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
    Scan QR code and get book details with history.
    
    Supports multiple QR code formats:
    - UUID (permanent_id): Direct lookup by permanent book ID
    - URL format: /books/{permanent_id}/history - extracts UUID from URL
    - Legacy qr_code format: Original QR code string
    
    - **qr_code**: QR code string from book (can be UUID, URL, or legacy format)
    
    Returns book information and complete reading history timeline.
    """
    book = None
    
    # Try to extract UUID from URL format: /books/{uuid}/history
    if "/books/" in qr_code and "/history" in qr_code:
        try:
            # Extract UUID from URL
            uuid_part = qr_code.split("/books/")[1].split("/history")[0]
            # Check if permanent_id column exists before querying
            if hasattr(Book, 'permanent_id'):
                book = db.query(Book).filter(Book.permanent_id == uuid_part).first()
        except (IndexError, ValueError, AttributeError):
            pass
    
    # If not found, try as direct UUID (permanent_id)
    if not book and hasattr(Book, 'permanent_id'):
        try:
            book = db.query(Book).filter(Book.permanent_id == qr_code).first()
        except Exception:
            pass
    
    # If still not found, try legacy qr_code format (for backward compatibility)
    if not book:
        book = db.query(Book).filter(Book.qr_code == qr_code).first()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found with this QR code. Please check the QR code and try again."
        )
    
    # Get book history with eager loading to avoid N+1 queries
    # History is append-only and persists across ownership transfers
    from sqlalchemy.orm import joinedload
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
        # Handle deleted users gracefully - show "Anonymous" if user was deleted
        username = None
        if entry.user_id:
            if entry.user:
                username = entry.user.username
            else:
                username = "Anonymous"  # User account was deleted but history preserved
        
        history.append(BookHistoryEntry(
            id=entry.id,
            action=entry.action,
            notes=entry.notes,
            city=entry.city,
            reading_duration_days=entry.reading_duration_days,
            user_id=entry.user_id,  # Preserved even if user deleted
            username=username,
            created_at=entry.created_at,
        ))
    
    # Get current holder info (may change with ownership transfers, but book's permanent_id persists)
    current_holder = None
    try:
        if book.owner:
            current_holder = {
                "user_id": book.owner.id,
                "username": book.owner.username,
                "email": book.owner.email if hasattr(book.owner, 'email') else None,
            }
    except Exception:
        # Graceful error handling - owner info not critical
        current_holder = None
    
    # Convert book to response
    from app.schemas.books import BookCondition
    condition_enum = BookCondition(book.condition)
    
    book_response = BookResponse(
        id=book.id,
        permanent_id=getattr(book, 'permanent_id', None),  # Handle missing column gracefully
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
        owner_username=book.owner.username if book.owner else "",
        created_at=book.created_at,
        updated_at=book.updated_at,
    )
    
    return QRCodeScanResponse(
        book=book_response,
        history=history,
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
    Add a history entry to a book without deleting previous records.
    
    This is an append-only operation - previous entries cannot be modified or deleted.
    History persists across ownership transfers and even if user accounts are deleted.
    
    - **book_id**: Book ID (can also use permanent_id via /books/by-uuid/{permanent_id}/history)
    - **notes**: Tips and notes from the reader (optional)
    - **city**: City where the book was read (optional)
    - **reading_duration_days**: How long the book was read in days (optional)
    - **action**: Action type (default: "read")
    
    Users can add their own reading history to books.
    History is preserved even if user account is deleted (user_id becomes null but entry remains).
    Requires authentication.
    """
    # Check if book exists
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Create history entry (append-only - cannot modify previous entries)
    # History persists even if user account is deleted (user_id becomes null but entry remains)
    history_entry = BookHistory(
        book_id=book_id,  # References book by ID (book's permanent_id persists across ownership)
        user_id=current_user.id,  # Stored but can become null if user deleted
        action=history_data.action,
        notes=history_data.notes,
        city=history_data.city,
        reading_duration_days=history_data.reading_duration_days,
    )
    
    db.add(history_entry)
    db.commit()
    db.refresh(history_entry)
    
    # Return formatted response
    return BookHistoryEntry(
        id=history_entry.id,
        action=history_entry.action,
        notes=history_entry.notes,
        city=history_entry.city,
        reading_duration_days=history_entry.reading_duration_days,
        user_id=history_entry.user_id,
        username=current_user.username,  # Current user still exists at creation time
        created_at=history_entry.created_at,
    )


@router.post("/{book_id}/wishlist", status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    book_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add book to wishlist.
    
    - **book_id**: Book ID to add to wishlist
    
    Requires authentication. User will receive alerts when book becomes available.
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
        book_id=book_id,
    )
    
    db.add(wishlist_item)
    db.commit()
    
    return {"message": "Book added to wishlist successfully"}


@router.delete("/{book_id}/wishlist", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_wishlist(
    book_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove book from wishlist.
    
    - **book_id**: Book ID to remove from wishlist
    
    Requires authentication.
    """
    wishlist_item = db.query(Wishlist).filter(
        Wishlist.user_id == current_user.id,
        Wishlist.book_id == book_id
    ).first()
    
    if not wishlist_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found in wishlist"
        )
    
    db.delete(wishlist_item)
    db.commit()
    
    return None


@router.get("/wishlist/my-list", response_model=BookListResponse)
async def get_my_wishlist(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's wishlist.
    
    Requires authentication.
    """
    from app.schemas.books import BookCondition
    
    # Query wishlist items
    wishlist_query = db.query(Wishlist).filter(Wishlist.user_id == current_user.id)
    
    # Get total count
    total = wishlist_query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    wishlist_items = wishlist_query.order_by(Wishlist.created_at.desc()).offset(offset).limit(page_size).all()
    
    # Get books from wishlist items
    books = []
    for item in wishlist_items:
        book = db.query(Book).filter(Book.id == item.book_id).first()
        if book:
            books.append(book)
    
    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    
    # Convert to response format
    book_responses = []
    for book in books:
        condition_enum = BookCondition(book.condition)
        book_responses.append(BookResponse(
            id=book.id,
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
            owner_username=book.owner.username if book.owner else "",
            created_at=book.created_at,
            updated_at=book.updated_at,
        ))
    
    return BookListResponse(
        books=book_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
