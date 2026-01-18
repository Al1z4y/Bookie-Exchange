"""
AI-based book value calculation service.
Calculates book value based on condition, demand, and rarity.
Includes OpenAI integration for intelligent pricing.
"""
import os
import logging
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.book import Book, Wishlist
from app.models.exchange import ExchangeRequest, ExchangeStatus
from app.core.config import settings

logger = logging.getLogger(__name__)

# Try to import OpenAI, but don't fail if not available
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("OpenAI package not installed. AI pricing will use fallback method.")


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


def get_openai_pricing(title: str, author: str, condition: str) -> Optional[int]:
    """
    Use OpenAI to get intelligent book pricing based on title, author, and condition.
    
    Args:
        title: Book title
        author: Book author
        condition: Book condition (excellent, good, fair, poor)
    
    Returns:
        Suggested point value (5-50 range) or None if AI fails
    """
    # Check if OpenAI is enabled and available
    if not settings.ENABLE_AI_PRICING or not OPENAI_AVAILABLE:
        return None
    
    if not settings.OPENAI_API_KEY:
        logger.debug("OpenAI API key not set. Using fallback pricing.")
        return None
    
    try:
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        
        # Create prompt for OpenAI
        prompt = f"""You are a book pricing expert for a book exchange platform. 
Evaluate this book and suggest a fair point value (5-50 points) based on:

Title: {title}
Author: {author}
Condition: {condition}

Consider:
- Book popularity and demand
- Author reputation and recognition
- Book rarity and collectibility
- Condition impact on value
- Market trends

Respond with ONLY a single integer between 5 and 50 representing the suggested point value.
Do not include any explanation, just the number."""

        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You are a book pricing expert. Respond with only a number between 5 and 50."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=10,
            temperature=0.3,  # Lower temperature for more consistent pricing
        )
        
        # Extract the number from response
        result_text = response.choices[0].message.content.strip()
        
        # Try to extract integer from response
        import re
        numbers = re.findall(r'\d+', result_text)
        if numbers:
            point_value = int(numbers[0])
            # Clamp to valid range
            point_value = max(5, min(50, point_value))
            logger.info(f"OpenAI pricing for '{title}' by {author}: {point_value} points")
            return point_value
        else:
            logger.warning(f"OpenAI returned non-numeric response: {result_text}")
            return None
            
    except Exception as e:
        logger.error(f"OpenAI pricing failed: {str(e)}")
        return None


def calculate_book_value(book_id: int, db: Session, base_points: int = None, use_ai: bool = True) -> int:
    """
    AI-based book value calculation combining:
    - OpenAI intelligent pricing (if available)
    - Condition (base multiplier)
    - Demand (wishlist, requests, activity)
    - Rarity (number of copies in system)
    
    Formula:
    final_value = base_value * condition_multiplier * (1 + demand_bonus + rarity_bonus)
    
    Args:
        book_id: Book ID
        db: Database session
        base_points: Optional base points (if None, uses condition-based default or AI)
        use_ai: Whether to attempt OpenAI pricing (default: True)
    
    Returns:
        Calculated point value (integer)
    """
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        return 10  # Default value
    
    # Try OpenAI pricing first if enabled
    ai_base_points = None
    if use_ai:
        ai_base_points = get_openai_pricing(book.title, book.author, book.condition)
    
    # Get base points if not provided
    if base_points is None:
        if ai_base_points is not None:
            # Use AI-suggested base points
            base_points = ai_base_points
        else:
            # Fallback to condition-based default
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


def update_book_value(book_id: int, db: Session, use_ai: bool = True) -> int:
    """
    Update book's point_value in database based on current demand, rarity, and AI pricing.
    Returns the new calculated value.
    
    Args:
        book_id: Book ID
        db: Database session
        use_ai: Whether to use OpenAI pricing (default: True)
    
    Returns:
        New calculated point value
    """
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        return 0
    
    new_value = calculate_book_value(book_id, db, use_ai=use_ai)
    book.point_value = new_value
    db.commit()
    
    return new_value
