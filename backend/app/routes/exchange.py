"""
Book exchange management routes.
Implements exchange system with circular exchange prevention, ownership transfer, and dispute handling.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.routes.auth import get_current_user
from app.models.user import User
from app.models.book import Book, BookHistory
from app.models.exchange import ExchangeRequest, ExchangeDispute, ExchangeStatus
from app.services.circular_exchange import check_circular_exchange
from app.schemas.exchange import (
    ExchangeRequestCreate,
    ExchangeRequestResponse,
    ExchangeApproval,
    ExchangeDisputeCreate,
    ExchangeDisputeResponse,
)

router = APIRouter(prefix="/exchange", tags=["exchange"])


@router.post("/request", response_model=ExchangeRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_exchange_request(
    request_data: ExchangeRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new book exchange request.
    
    - **book_id**: ID of the book to request
    - **message**: Optional message to the book owner
    
    Requires authentication. Points will be deducted from requester's balance.
    Prevents circular exchanges using graph theory.
    """
    # Get the book
    book = db.query(Book).filter(Book.id == request_data.book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Check if book is available
    if not book.is_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book is not available for exchange"
        )
    
    # Check if user is requesting their own book
    if book.owner_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot request your own book"
        )
    
    # Check for circular exchange using graph theory
    is_circular, circular_message = check_circular_exchange(
        current_user.id,
        book.owner_id,
        db
    )
    if is_circular:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=circular_message
        )
    
    # Check if user has enough points using the book's CURRENT point value
    # Don't recalculate value here as it would include this pending request in demand calculation
    # The book value should be based on inherent value (condition, rarity, historical demand),
    # not on whether someone is currently requesting it
    if current_user.points_balance < book.point_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient points to request this book. You need {book.point_value} points but only have {current_user.points_balance} points. Please purchase more points or list books to earn points."
        )
    
    # Mark book as unavailable while request is pending (to prevent multiple requests)
    book.is_available = False
    
    # Create exchange request (points will be deducted when approved)
    exchange_request = ExchangeRequest(
        book_id=book.id,
        requester_id=current_user.id,
        owner_id=book.owner_id,
        status=ExchangeStatus.PENDING,
        points_cost=book.point_value,
        message=request_data.message,
    )
    
    db.add(exchange_request)
    
    db.commit()
    db.refresh(exchange_request)
    
    # Create book history entry
    history_entry = BookHistory(
        book_id=book.id,
        user_id=current_user.id,
        reader_name=current_user.username,  # Store name to survive account deletion
        action="exchange_requested",
        notes=f"Exchange request created by {current_user.username}",
    )
    db.add(history_entry)
    db.commit()
    
    return ExchangeRequestResponse(
        id=exchange_request.id,
        book_id=exchange_request.book_id,
        book_title=book.title,
        requester_id=exchange_request.requester_id,
        requester_username=current_user.username,
        owner_id=exchange_request.owner_id,
        owner_username=book.owner.username,
        status=exchange_request.status,
        points_cost=exchange_request.points_cost,
        message=exchange_request.message,
        created_at=exchange_request.created_at,
        updated_at=exchange_request.updated_at,
        completed_at=exchange_request.completed_at,
    )


@router.post("/approve/{exchange_id}", response_model=ExchangeRequestResponse)
async def approve_exchange(
    exchange_id: int,
    approval: ExchangeApproval,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Approve or reject an exchange request.
    
    - **exchange_id**: Exchange request ID
    - **approve**: True to approve, False to reject
    - **message**: Optional message
    
    Only the book owner can approve/reject requests.
    Requires authentication.
    """
    exchange = db.query(ExchangeRequest).filter(ExchangeRequest.id == exchange_id).first()
    if not exchange:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exchange request not found"
        )
    
    # Verify ownership
    if exchange.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the book owner can approve/reject exchange requests"
        )
    
    if approval.approve:
        # Get the book
        book = db.query(Book).filter(Book.id == exchange.book_id).first()
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found"
            )
        
        # Transfer ownership immediately upon approval (not duplicate)
        old_owner_id = book.owner_id
        book.owner_id = exchange.requester_id
        book.is_available = True  # Mark as available so new owner can list it again
        
        # Deduct points from requester (only when approved)
        requester = db.query(User).filter(User.id == exchange.requester_id).first()
        if requester:
            # Check if requester still has enough points
            if requester.points_balance < exchange.points_cost:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Requester no longer has enough points. Required: {exchange.points_cost}, Available: {requester.points_balance}"
                )
            
            requester.points_balance -= exchange.points_cost
            
            # Create point transaction for deduction
            from app.models.points import PointTransaction, PointTransactionType
            redeem_transaction = PointTransaction(
                user_id=requester.id,
                amount=-exchange.points_cost,  # Negative for redeemed
                transaction_type=PointTransactionType.REDEEMED,
                description=f"Redeemed {exchange.points_cost} points for book exchange: {book.title}",
                related_exchange_id=exchange.id,
            )
            db.add(redeem_transaction)
        
        # Award points to the old owner (they received the book's value)
        old_owner = db.query(User).filter(User.id == old_owner_id).first()
        if old_owner:
            old_owner.points_balance += exchange.points_cost
            
            # Create point transaction for earning
            from app.models.points import PointTransaction, PointTransactionType
            earn_transaction = PointTransaction(
                user_id=old_owner.id,
                amount=exchange.points_cost,
                transaction_type=PointTransactionType.EARNED,
                description=f"Earned {exchange.points_cost} points from book exchange: {book.title}",
                related_exchange_id=exchange.id,
            )
            db.add(earn_transaction)
        
        # Update exchange status to COMPLETED (ownership transferred)
        exchange.status = ExchangeStatus.COMPLETED
        exchange.completed_at = datetime.utcnow()
        
        # Create book history entries (history persists across ownership transfers)
        requester = db.query(User).filter(User.id == exchange.requester_id).first()
        history_entry1 = BookHistory(
            book_id=book.id,  # Book ID persists, only owner_id changes
            user_id=exchange.requester_id,
            reader_name=requester.username if requester else "Unknown",  # Store name to survive account deletion
            action="ownership_transferred",
            notes=f"Book ownership transferred from {old_owner.username if old_owner else 'unknown'} to {requester.username if requester else 'unknown'} upon exchange approval.",
        )
        # Note: We only create one history entry for the new owner
        # The book's permanent_id and history remain intact
        db.add(history_entry1)
    else:
        exchange.status = ExchangeStatus.REJECTED
        # Make book available again since request was rejected
        book = db.query(Book).filter(Book.id == exchange.book_id).first()
        if book:
            book.is_available = True
            
            # Check for wishlist alerts
            from app.services.wishlist_alerts import check_and_send_wishlist_alerts
            check_and_send_wishlist_alerts(book.id, db)
        
        # No points to refund since points weren't deducted on request
    
    db.commit()
    db.refresh(exchange)
    
    # Refresh book to get updated owner_id
    book = db.query(Book).filter(Book.id == exchange.book_id).first()
    requester = db.query(User).filter(User.id == exchange.requester_id).first()
    
    # Get the current owner (which is the requester if approved, or original owner if rejected)
    current_owner = db.query(User).filter(User.id == book.owner_id).first() if book else None
    
    return ExchangeRequestResponse(
        id=exchange.id,
        book_id=exchange.book_id,
        book_title=book.title if book else "",
        requester_id=exchange.requester_id,
        requester_username=requester.username if requester else "",
        owner_id=book.owner_id if book else exchange.owner_id,
        owner_username=current_owner.username if current_owner else (requester.username if requester else ""),
        status=exchange.status,
        points_cost=exchange.points_cost,
        message=exchange.message,
        created_at=exchange.created_at,
        updated_at=exchange.updated_at,
        completed_at=exchange.completed_at,
    )


@router.post("/complete/{exchange_id}", response_model=ExchangeRequestResponse)
async def complete_exchange(
    exchange_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark an exchange as completed.
    
    Note: Exchanges are automatically completed when approved.
    This endpoint is kept for backward compatibility.
    
    - **exchange_id**: Exchange request ID
    
    Requires authentication.
    """
    exchange = db.query(ExchangeRequest).filter(ExchangeRequest.id == exchange_id).first()
    if not exchange:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exchange request not found"
        )
    
    # Verify user is part of exchange
    if exchange.requester_id != current_user.id and exchange.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this exchange"
        )
    
    # If already completed (from approval), just return it
    if exchange.status == ExchangeStatus.COMPLETED:
        book = db.query(Book).filter(Book.id == exchange.book_id).first()
        requester = db.query(User).filter(User.id == exchange.requester_id).first()
        current_owner = db.query(User).filter(User.id == book.owner_id).first() if book else None
        
        return ExchangeRequestResponse(
            id=exchange.id,
            book_id=exchange.book_id,
            book_title=book.title if book else "",
            requester_id=exchange.requester_id,
            requester_username=requester.username if requester else "",
            owner_id=book.owner_id if book else exchange.owner_id,
            owner_username=current_owner.username if current_owner else "",
            status=exchange.status,
            points_cost=exchange.points_cost,
            message=exchange.message,
            created_at=exchange.created_at,
            updated_at=exchange.updated_at,
            completed_at=exchange.completed_at,
        )
    
    # If not completed, return error (should be completed via approval)
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Exchange must be approved first. Current status: {exchange.status.value}"
    )


@router.post("/cancel/{exchange_id}", response_model=ExchangeRequestResponse)
async def cancel_exchange(
    exchange_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel an exchange request.
    
    - **exchange_id**: Exchange request ID
    
    Either party can cancel if status is pending or approved.
    Points will be refunded to requester.
    Requires authentication.
    """
    exchange = db.query(ExchangeRequest).filter(ExchangeRequest.id == exchange_id).first()
    if not exchange:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exchange request not found"
        )
    
    # Verify user is part of exchange
    if exchange.requester_id != current_user.id and exchange.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this exchange"
        )
    
    # Check if exchange can be cancelled
    if exchange.status not in [ExchangeStatus.PENDING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel exchange with status: {exchange.status.value}. Only pending requests can be cancelled."
        )
    
    # No points to refund since points weren't deducted on request (only on approval)
    
    # Mark book as available again
    book = db.query(Book).filter(Book.id == exchange.book_id).first()
    if book:
        book.is_available = True
        
        # Check for wishlist alerts
        from app.services.wishlist_alerts import check_and_send_wishlist_alerts
        check_and_send_wishlist_alerts(book.id, db)
    
    # Update exchange status
    exchange.status = ExchangeStatus.CANCELLED
    
    db.commit()
    db.refresh(exchange)
    
    book = db.query(Book).filter(Book.id == exchange.book_id).first()
    requester = db.query(User).filter(User.id == exchange.requester_id).first()
    owner = db.query(User).filter(User.id == exchange.owner_id).first()
    
    return ExchangeRequestResponse(
        id=exchange.id,
        book_id=exchange.book_id,
        book_title=book.title if book else "",
        requester_id=exchange.requester_id,
        requester_username=requester.username if requester else "",
        owner_id=exchange.owner_id,
        owner_username=owner.username if owner else "",
        status=exchange.status,
        points_cost=exchange.points_cost,
        message=exchange.message,
        created_at=exchange.created_at,
        updated_at=exchange.updated_at,
        completed_at=exchange.completed_at,
    )


@router.post("/dispute", response_model=ExchangeDisputeResponse, status_code=status.HTTP_201_CREATED)
async def create_dispute(
    dispute_data: ExchangeDisputeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a dispute for an exchange, especially for condition mismatches.
    
    - **exchange_id**: Exchange request ID
    - **reason**: Reason for dispute (e.g., "condition_mismatch")
    - **description**: Detailed description
    
    Either party can create a dispute.
    Requires authentication.
    """
    exchange = db.query(ExchangeRequest).filter(ExchangeRequest.id == dispute_data.exchange_id).first()
    if not exchange:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exchange request not found"
        )
    
    # Verify user is part of exchange
    if exchange.requester_id != current_user.id and exchange.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this exchange"
        )
    
    # Check if exchange is in a state that can be disputed
    if exchange.status not in [ExchangeStatus.APPROVED, ExchangeStatus.COMPLETED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot create dispute for exchange with status: {exchange.status.value}"
        )
    
    # Check if dispute already exists
    existing_dispute = db.query(ExchangeDispute).filter(
        ExchangeDispute.exchange_id == dispute_data.exchange_id,
        ExchangeDispute.status == "open"
    ).first()
    
    if existing_dispute:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An open dispute already exists for this exchange"
        )
    
    # Create dispute
    dispute = ExchangeDispute(
        exchange_id=dispute_data.exchange_id,
        reported_by_id=current_user.id,
        reason=dispute_data.reason,
        description=dispute_data.description,
        status="open",
    )
    
    # Update exchange status to disputed
    exchange.status = ExchangeStatus.DISPUTED
    
    db.add(dispute)
    db.commit()
    db.refresh(dispute)
    
    return ExchangeDisputeResponse(
        id=dispute.id,
        exchange_id=dispute.exchange_id,
        reported_by_id=dispute.reported_by_id,
        reason=dispute.reason,
        description=dispute.description,
        status=dispute.status,
        created_at=dispute.created_at,
        resolved_at=dispute.resolved_at,
    )


@router.get("/my-requests", response_model=list[ExchangeRequestResponse])
async def get_my_requests(
    status_filter: str = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's exchange requests (both sent and received).
    
    Requires authentication.
    """
    query = db.query(ExchangeRequest).filter(
        (ExchangeRequest.requester_id == current_user.id) |
        (ExchangeRequest.owner_id == current_user.id)
    )
    
    if status_filter:
        try:
            status_enum = ExchangeStatus(status_filter.lower())
            query = query.filter(ExchangeRequest.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )
    
    offset = (page - 1) * page_size
    exchanges = query.order_by(ExchangeRequest.created_at.desc()).offset(offset).limit(page_size).all()
    
    results = []
    for exchange in exchanges:
        book = db.query(Book).filter(Book.id == exchange.book_id).first()
        requester = db.query(User).filter(User.id == exchange.requester_id).first()
        owner = db.query(User).filter(User.id == exchange.owner_id).first()
        
        results.append(ExchangeRequestResponse(
            id=exchange.id,
            book_id=exchange.book_id,
            book_title=book.title if book else "",
            requester_id=exchange.requester_id,
            requester_username=requester.username if requester else "",
            owner_id=exchange.owner_id,
            owner_username=owner.username if owner else "",
            status=exchange.status,
            points_cost=exchange.points_cost,
            message=exchange.message,
            created_at=exchange.created_at,
            updated_at=exchange.updated_at,
            completed_at=exchange.completed_at,
        ))
    
    return results


@router.get("/{exchange_id}", response_model=ExchangeRequestResponse)
async def get_exchange(
    exchange_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get exchange request details by ID.
    
    Only parties involved in the exchange can view it.
    Requires authentication.
    """
    exchange = db.query(ExchangeRequest).filter(ExchangeRequest.id == exchange_id).first()
    if not exchange:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exchange request not found"
        )
    
    # Verify user is part of exchange
    if exchange.requester_id != current_user.id and exchange.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this exchange"
        )
    
    book = db.query(Book).filter(Book.id == exchange.book_id).first()
    requester = db.query(User).filter(User.id == exchange.requester_id).first()
    owner = db.query(User).filter(User.id == exchange.owner_id).first()
    
    return ExchangeRequestResponse(
        id=exchange.id,
        book_id=exchange.book_id,
        book_title=book.title if book else "",
        requester_id=exchange.requester_id,
        requester_username=requester.username if requester else "",
        owner_id=exchange.owner_id,
        owner_username=owner.username if owner else "",
        status=exchange.status,
        points_cost=exchange.points_cost,
        message=exchange.message,
        created_at=exchange.created_at,
        updated_at=exchange.updated_at,
        completed_at=exchange.completed_at,
    )
