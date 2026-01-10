"""
Payment and point purchase routes.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.routes.auth import get_current_user
from app.models.user import User
from app.models.payment import PaymentTransaction, PaymentMethod, PaymentStatus
from app.models.points import PointTransaction, PointTransactionType
from app.schemas.payment import (
    PointPurchaseCreate,
    PointPurchaseResponse,
    PaymentWebhook,
)

router = APIRouter(prefix="/payment", tags=["payment"])

# Point pricing (points per USD)
POINT_PRICING = {
    100: 5.00,   # 20 points per USD
    250: 10.00,  # 25 points per USD
    500: 18.00,  # ~27.8 points per USD
    1000: 30.00, # ~33.3 points per USD
}


@router.post("/purchase-points", response_model=PointPurchaseResponse, status_code=status.HTTP_201_CREATED)
async def purchase_points(
    purchase_data: PointPurchaseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Purchase points with real money.
    
    - **points_amount**: Number of points to purchase
    - **payment_method**: Payment method (credit_card, debit_card, paypal, stripe)
    - **amount_usd**: Amount in USD
    
    Requires authentication.
    Returns payment transaction details.
    """
    # Validate points amount
    if purchase_data.points_amount not in POINT_PRICING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid points amount. Valid amounts: {list(POINT_PRICING.keys())}"
        )
    
    # Validate price
    expected_price = POINT_PRICING[purchase_data.points_amount]
    if abs(purchase_data.amount_usd - expected_price) > 0.01:  # Allow small floating point differences
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid price. Expected ${expected_price:.2f} for {purchase_data.points_amount} points"
        )
    
    # Generate unique transaction ID
    transaction_id = f"TXN-{uuid.uuid4().hex[:16].upper()}"
    
    # Create payment transaction
    payment_transaction = PaymentTransaction(
        user_id=current_user.id,
        points_amount=purchase_data.points_amount,
        amount_usd=purchase_data.amount_usd,
        payment_method=purchase_data.payment_method,
        status=PaymentStatus.PENDING,
        transaction_id=transaction_id,
    )
    
    db.add(payment_transaction)
    db.flush()
    
    # In a real implementation, you would integrate with payment gateway here
    # For now, we'll simulate payment processing
    # TODO: Integrate with Stripe, PayPal, or other payment gateway
    
    # Simulate payment processing (in production, this would be async via webhook)
    # For demo purposes, we'll mark as completed immediately
    # In production, use webhook to update status after payment confirmation
    
    payment_transaction.status = PaymentStatus.COMPLETED
    payment_transaction.completed_at = datetime.utcnow()
    
    # Add points to user account
    current_user.points_balance += purchase_data.points_amount
    
    # Create point transaction record
    point_transaction = PointTransaction(
        user_id=current_user.id,
        amount=purchase_data.points_amount,
        transaction_type=PointTransactionType.PURCHASED,
        description=f"Purchased {purchase_data.points_amount} points for ${purchase_data.amount_usd:.2f}",
    )
    db.add(point_transaction)
    
    db.commit()
    db.refresh(payment_transaction)
    
    return PointPurchaseResponse(
        id=payment_transaction.id,
        user_id=payment_transaction.user_id,
        points_amount=payment_transaction.points_amount,
        amount_usd=payment_transaction.amount_usd,
        payment_method=payment_transaction.payment_method,
        status=payment_transaction.status,
        transaction_id=payment_transaction.transaction_id,
        created_at=payment_transaction.created_at,
        completed_at=payment_transaction.completed_at,
    )


@router.get("/transactions", response_model=list[PointPurchaseResponse])
async def get_payment_transactions(
    status_filter: str = Query(None, description="Filter by payment status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's payment transaction history.
    
    - **status_filter**: Filter by status (pending, processing, completed, failed, refunded)
    - **page**: Page number
    - **page_size**: Items per page
    
    Requires authentication.
    """
    query = db.query(PaymentTransaction).filter(PaymentTransaction.user_id == current_user.id)
    
    if status_filter:
        try:
            status_enum = PaymentStatus(status_filter.lower())
            query = query.filter(PaymentTransaction.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )
    
    offset = (page - 1) * page_size
    transactions = query.order_by(PaymentTransaction.created_at.desc()).offset(offset).limit(page_size).all()
    
    return [
        PointPurchaseResponse(
            id=t.id,
            user_id=t.user_id,
            points_amount=t.points_amount,
            amount_usd=t.amount_usd,
            payment_method=t.payment_method,
            status=t.status,
            transaction_id=t.transaction_id,
            created_at=t.created_at,
            completed_at=t.completed_at,
        )
        for t in transactions
    ]


@router.get("/transactions/{transaction_id}", response_model=PointPurchaseResponse)
async def get_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get payment transaction details by ID.
    
    - **transaction_id**: Transaction ID
    
    Requires authentication. Only the transaction owner can view it.
    """
    transaction = db.query(PaymentTransaction).filter(PaymentTransaction.id == transaction_id).first()
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
    
    return PointPurchaseResponse(
        id=transaction.id,
        user_id=transaction.user_id,
        points_amount=transaction.points_amount,
        amount_usd=transaction.amount_usd,
        payment_method=transaction.payment_method,
        status=transaction.status,
        transaction_id=transaction.transaction_id,
        created_at=transaction.created_at,
        completed_at=transaction.completed_at,
    )


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def payment_webhook(
    webhook_data: PaymentWebhook,
    db: Session = Depends(get_db)
):
    """
    Payment gateway webhook endpoint.
    
    Receives payment status updates from payment gateway.
    This endpoint should be secured with webhook signature verification.
    """
    # Find transaction by transaction_id
    transaction = db.query(PaymentTransaction).filter(
        PaymentTransaction.transaction_id == webhook_data.transaction_id
    ).first()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    # Update transaction status
    old_status = transaction.status
    transaction.status = webhook_data.status
    
    # If payment completed, add points to user
    if webhook_data.status == PaymentStatus.COMPLETED and old_status != PaymentStatus.COMPLETED:
        transaction.completed_at = datetime.utcnow()
        
        user = db.query(User).filter(User.id == transaction.user_id).first()
        if user:
            user.points_balance += transaction.points_amount
            
            # Create point transaction
            point_transaction = PointTransaction(
                user_id=user.id,
                amount=transaction.points_amount,
                transaction_type=PointTransactionType.PURCHASED,
                description=f"Purchased {transaction.points_amount} points via payment gateway",
            )
            db.add(point_transaction)
    
    db.commit()
    
    return {"status": "success", "message": "Webhook processed"}


@router.get("/pricing", status_code=status.HTTP_200_OK)
async def get_point_pricing():
    """
    Get point pricing information.
    
    Returns available point packages and pricing.
    """
    return {
        "packages": [
            {"points": points, "price_usd": price}
            for points, price in POINT_PRICING.items()
        ],
        "currency": "USD",
    }
