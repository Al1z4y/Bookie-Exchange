"""
AI-based book value calculation service.
Calculates book value based on condition, demand, and rarity.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.book import Book, Wishlist
from app.models.exchange import ExchangeRequest, ExchangeStatus


def calculate_demand_score(book_id: int, db: Session) -> float:
    """
    Calculate demand score based on:
    - Number of wishlist entries
    - Number of pending exchange requests
    - Recent exchange activity
    """
    # Count wishlist entries
    wishlist_count = db.query(func.count(Wishlist.id)).filter(
        Wishlist.book_id == book_id
    ).scalar() or 0
    
    # Count pending/approved exchange requests
    exchange_requests_count = db.query(func.count(ExchangeRequest.id)).filter(
        ExchangeRequest.book_id == book_id,
        ExchangeRequest.status.in_([ExchangeStatus.PENDING, ExchangeStatus.APPROVED])
    ).scalar() or 0
    
    # Count completed exchanges (recent activity indicator)
    completed_exchanges = db.query(func.count(ExchangeRequest.id)).filter(
        ExchangeRequest.book_id == book_id,
        ExchangeRequest.status == ExchangeStatus.COMPLETED
    ).scalar() or 0
    
    # Calculate demand score (weighted)
    # Wishlist: 0.5 points each
    # Pending requests: 2 points each
    # Completed exchanges: 0.2 points each (shows historical interest)
    demand_score = (wishlist_count * 0.5) + (exchange_requests_count * 2.0) + (completed_exchanges * 0.2)
    
    # Normalize to 0-1 range (cap at 20 for max demand)
    normalized_demand = min(demand_score / 20.0, 1.0)
    
    return normalized_demand


def calculate_rarity_score(book_id: int, db: Session) -> float:
    """
    Calculate rarity score based on:
    - Number of copies of the same book (title + author) in the system
    - Lower count = higher rarity
    """
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        return 0.5  # Default if book not found
    
    # Count books with same title and author
    same_books_count = db.query(func.count(Book.id)).filter(
        func.lower(Book.title) == func.lower(book.title),
        func.lower(Book.author) == func.lower(book.author),
        Book.is_available == True
    ).scalar() or 1  # At least 1 (the book itself)
    
    # Rarity score: fewer copies = higher rarity
    # Formula: 1 / (1 + count) gives higher score for lower counts
    # Normalize so 1 copy = 1.0, 2 copies = 0.5, 3 copies = 0.33, etc.
    rarity_score = 1.0 / (1.0 + (same_books_count - 1))
    
    return rarity_score


def calculate_condition_multiplier(condition: str) -> float:
    """
    Get condition multiplier for base point calculation.
    """
    condition_multipliers = {
        "excellent": 1.0,
        "good": 0.8,
        "fair": 0.6,
        "poor": 0.4,
    }
    return condition_multipliers.get(condition.lower(), 0.6)


def calculate_book_value(book_id: int, db: Session, base_points: int = None) -> int:
    """
    AI-based book value calculation combining:
    - Condition (base multiplier)
    - Demand (wishlist, requests, activity)
    - Rarity (number of copies in system)
    
    Formula:
    final_value = base_value * condition_multiplier * (1 + demand_bonus + rarity_bonus)
    
    Args:
        book_id: Book ID
        db: Database session
        base_points: Optional base points (if None, uses condition-based default)
    
    Returns:
        Calculated point value (integer)
    """
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        return 10  # Default value
    
    # Get base points if not provided
    if base_points is None:
        base_points_map = {
            "excellent": 15,
            "good": 12,
            "fair": 8,
            "poor": 5,
        }
        base_points = base_points_map.get(book.condition.lower(), 10)
    
    # Calculate components
    condition_multiplier = calculate_condition_multiplier(book.condition)
    demand_score = calculate_demand_score(book_id, db)
    rarity_score = calculate_rarity_score(book_id, db)
    
    # Apply bonuses (demand and rarity can add up to 50% bonus each)
    demand_bonus = demand_score * 0.5  # Up to 50% bonus
    rarity_bonus = rarity_score * 0.5  # Up to 50% bonus
    
    # Calculate final value
    # Base value with condition multiplier
    base_value = base_points * condition_multiplier
    
    # Apply demand and rarity bonuses
    final_value = base_value * (1.0 + demand_bonus + rarity_bonus)
    
    # Round to nearest integer, minimum 1 point
    return max(1, int(round(final_value)))


def update_book_value(book_id: int, db: Session) -> int:
    """
    Update book's point_value in database based on current demand and rarity.
    Returns the new calculated value.
    """
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        return 0
    
    new_value = calculate_book_value(book_id, db)
    book.point_value = new_value
    db.commit()
    
    return new_value
