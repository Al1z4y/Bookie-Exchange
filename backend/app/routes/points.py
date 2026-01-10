"""
Points management routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.routes.auth import get_current_user
from app.models.user import User
from app.models.points import PointTransaction, PointTransactionType
from app.schemas.points import (
    PointTransactionResponse,
    PointsBalanceResponse,
    PointTransactionListResponse,
)

router = APIRouter(prefix="/points", tags=["points"])


@router.get("/balance", response_model=PointsBalanceResponse)
async def get_points_balance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's points balance and statistics.
    
    Returns:
    - Current balance
    - Total points earned
    - Total points redeemed
    - Total points purchased
    
    Requires authentication.
    """
    # Get current balance from user
    balance = current_user.points_balance
    
    # Calculate statistics from transactions
    total_earned = db.query(func.sum(PointTransaction.amount)).filter(
        PointTransaction.user_id == current_user.id,
        PointTransaction.transaction_type.in_([
            PointTransactionType.EARNED,
            PointTransactionType.PURCHASED,
            PointTransactionType.BONUS,
        ])
    ).scalar() or 0
    
    total_redeemed = abs(db.query(func.sum(PointTransaction.amount)).filter(
        PointTransaction.user_id == current_user.id,
        PointTransaction.transaction_type == PointTransactionType.REDEEMED
    ).scalar() or 0)
    
    total_purchased = db.query(func.sum(PointTransaction.amount)).filter(
        PointTransaction.user_id == current_user.id,
        PointTransaction.transaction_type == PointTransactionType.PURCHASED
    ).scalar() or 0
    
    return PointsBalanceResponse(
        user_id=current_user.id,
        balance=balance,
        total_earned=int(total_earned) if total_earned else 0,
        total_redeemed=int(total_redeemed) if total_redeemed else 0,
        total_purchased=int(total_purchased) if total_purchased else 0,
    )


@router.get("/transactions", response_model=PointTransactionListResponse)
async def get_point_transactions(
    transaction_type: str = Query(None, description="Filter by transaction type"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's point transaction history.
    
    - **transaction_type**: Filter by type (earned, redeemed, purchased, refunded, bonus)
    - **page**: Page number
    - **page_size**: Items per page
    
    Requires authentication.
    """
    query = db.query(PointTransaction).filter(PointTransaction.user_id == current_user.id)
    
    if transaction_type:
        try:
            type_enum = PointTransactionType(transaction_type.lower())
            query = query.filter(PointTransaction.transaction_type == type_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid transaction type: {transaction_type}"
            )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    transactions = query.order_by(PointTransaction.created_at.desc()).offset(offset).limit(page_size).all()
    
    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    
    # Convert to response format
    transaction_responses = []
    for transaction in transactions:
        transaction_responses.append(PointTransactionResponse(
            id=transaction.id,
            user_id=transaction.user_id,
            amount=transaction.amount,
            transaction_type=transaction.transaction_type,
            description=transaction.description,
            related_exchange_id=transaction.related_exchange_id,
            created_at=transaction.created_at,
        ))
    
    return PointTransactionListResponse(
        transactions=transaction_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        current_balance=current_user.points_balance,
    )


@router.get("/transactions/{transaction_id}", response_model=PointTransactionResponse)
async def get_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get point transaction details by ID.
    
    - **transaction_id**: Transaction ID
    
    Only the transaction owner can view it.
    Requires authentication.
    """
    transaction = db.query(PointTransaction).filter(PointTransaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    # Verify ownership
    if transaction.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own transactions"
        )
    
    return PointTransactionResponse(
        id=transaction.id,
        user_id=transaction.user_id,
        amount=transaction.amount,
        transaction_type=transaction.transaction_type,
        description=transaction.description,
        related_exchange_id=transaction.related_exchange_id,
        created_at=transaction.created_at,
    )
