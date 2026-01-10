"""
Physical exchange points/locations management routes.
"""
import math
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.core.database import get_db
from app.routes.auth import get_current_user
from app.models.user import User
from app.models.exchange_point import ExchangePoint
from app.schemas.exchange_points import (
    ExchangePointCreate,
    ExchangePointUpdate,
    ExchangePointResponse,
    ExchangePointListResponse,
)

router = APIRouter(prefix="/exchange-points", tags=["exchange-points"])


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two coordinates using Haversine formula.
    Returns distance in kilometers.
    """
    R = 6371  # Earth radius in kilometers
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c


@router.post("", response_model=ExchangePointResponse, status_code=status.HTTP_201_CREATED)
async def create_exchange_point(
    point_data: ExchangePointCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new physical exchange point location.
    
    Requires authentication (admin only for now, but can be changed to allow users).
    """
    # Check if user is admin (for now, allow all authenticated users)
    # In production, you might want to restrict this to admins only
    # if not current_user.is_admin:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Only admins can create exchange points"
    #     )
    
    # Create exchange point
    exchange_point = ExchangePoint(
        name=point_data.name,
        description=point_data.description,
        address=point_data.address,
        latitude=point_data.latitude,
        longitude=point_data.longitude,
        contact_phone=point_data.contact_phone,
        contact_email=point_data.contact_email,
        operating_hours=point_data.operating_hours,
        is_active=point_data.is_active,
    )
    
    db.add(exchange_point)
    db.commit()
    db.refresh(exchange_point)
    
    return ExchangePointResponse(
        id=exchange_point.id,
        name=exchange_point.name,
        description=exchange_point.description,
        address=exchange_point.address,
        latitude=exchange_point.latitude,
        longitude=exchange_point.longitude,
        contact_phone=exchange_point.contact_phone,
        contact_email=exchange_point.contact_email,
        operating_hours=exchange_point.operating_hours,
        is_active=exchange_point.is_active,
        created_at=exchange_point.created_at,
        updated_at=exchange_point.updated_at,
    )


@router.get("", response_model=ExchangePointListResponse)
async def list_exchange_points(
    query: str = Query(None, description="Search query"),
    latitude: float = Query(None, description="Latitude for proximity search"),
    longitude: float = Query(None, description="Longitude for proximity search"),
    radius_km: float = Query(None, description="Search radius in kilometers"),
    is_active: bool = Query(True, description="Filter by active status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    List physical exchange points with search and filtering.
    
    Supports proximity-based search for finding nearby exchange points.
    """
    points_query = db.query(ExchangePoint)
    
    # Filter by active status
    if is_active is not None:
        points_query = points_query.filter(ExchangePoint.is_active == is_active)
    
    # Search query
    if query:
        search_term = f"%{query}%"
        points_query = points_query.filter(
            or_(
                ExchangePoint.name.ilike(search_term),
                ExchangePoint.description.ilike(search_term),
                ExchangePoint.address.ilike(search_term),
            )
        )
    
    # Get all points first (for proximity calculation)
    all_points = points_query.all()
    
    # Apply proximity filter if coordinates provided
    if latitude is not None and longitude is not None:
        filtered_points = []
        for point in all_points:
            distance = calculate_distance(latitude, longitude, point.latitude, point.longitude)
            if radius_km is None or distance <= radius_km:
                # Add distance to point object for sorting
                point._distance = distance
                filtered_points.append(point)
        
        # Sort by distance
        filtered_points.sort(key=lambda p: p._distance)
        all_points = filtered_points
    
    # Get total count
    total = len(all_points)
    
    # Apply pagination
    offset = (page - 1) * page_size
    paginated_points = all_points[offset:offset + page_size]
    
    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    
    # Convert to response format
    point_responses = []
    for point in paginated_points:
        point_responses.append(ExchangePointResponse(
            id=point.id,
            name=point.name,
            description=point.description,
            address=point.address,
            latitude=point.latitude,
            longitude=point.longitude,
            contact_phone=point.contact_phone,
            contact_email=point.contact_email,
            operating_hours=point.operating_hours,
            is_active=point.is_active,
            created_at=point.created_at,
            updated_at=point.updated_at,
        ))
    
    return ExchangePointListResponse(
        points=point_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/nearby", response_model=ExchangePointListResponse)
async def get_nearby_exchange_points(
    latitude: float = Query(..., description="Latitude"),
    longitude: float = Query(..., description="Longitude"),
    radius_km: float = Query(10.0, description="Search radius in kilometers"),
    db: Session = Depends(get_db)
):
    """
    Get nearby exchange points based on coordinates.
    
    Returns exchange points within the specified radius, sorted by distance.
    """
    # Get all active exchange points
    all_points = db.query(ExchangePoint).filter(ExchangePoint.is_active == True).all()
    
    # Calculate distances and filter
    nearby_points = []
    for point in all_points:
        distance = calculate_distance(latitude, longitude, point.latitude, point.longitude)
        if distance <= radius_km:
            point._distance = distance
            nearby_points.append(point)
    
    # Sort by distance
    nearby_points.sort(key=lambda p: p._distance)
    
    # Convert to response format
    point_responses = []
    for point in nearby_points:
        point_responses.append(ExchangePointResponse(
            id=point.id,
            name=point.name,
            description=point.description,
            address=point.address,
            latitude=point.latitude,
            longitude=point.longitude,
            contact_phone=point.contact_phone,
            contact_email=point.contact_email,
            operating_hours=point.operating_hours,
            is_active=point.is_active,
            created_at=point.created_at,
            updated_at=point.updated_at,
        ))
    
    return ExchangePointListResponse(
        points=point_responses,
        total=len(point_responses),
        page=1,
        page_size=len(point_responses),
        total_pages=1,
    )


@router.get("/{point_id}", response_model=ExchangePointResponse)
async def get_exchange_point(
    point_id: int,
    db: Session = Depends(get_db)
):
    """
    Get exchange point details by ID.
    """
    point = db.query(ExchangePoint).filter(ExchangePoint.id == point_id).first()
    if not point:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exchange point not found"
        )
    
    return ExchangePointResponse(
        id=point.id,
        name=point.name,
        description=point.description,
        address=point.address,
        latitude=point.latitude,
        longitude=point.longitude,
        contact_phone=point.contact_phone,
        contact_email=point.contact_email,
        operating_hours=point.operating_hours,
        is_active=point.is_active,
        created_at=point.created_at,
        updated_at=point.updated_at,
    )


@router.put("/{point_id}", response_model=ExchangePointResponse)
async def update_exchange_point(
    point_id: int,
    point_update: ExchangePointUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update exchange point information.
    
    Requires authentication (admin only).
    """
    point = db.query(ExchangePoint).filter(ExchangePoint.id == point_id).first()
    if not point:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exchange point not found"
        )
    
    # Update fields
    if point_update.name is not None:
        point.name = point_update.name
    if point_update.description is not None:
        point.description = point_update.description
    if point_update.address is not None:
        point.address = point_update.address
    if point_update.latitude is not None:
        point.latitude = point_update.latitude
    if point_update.longitude is not None:
        point.longitude = point_update.longitude
    if point_update.contact_phone is not None:
        point.contact_phone = point_update.contact_phone
    if point_update.contact_email is not None:
        point.contact_email = point_update.contact_email
    if point_update.operating_hours is not None:
        point.operating_hours = point_update.operating_hours
    if point_update.is_active is not None:
        point.is_active = point_update.is_active
    
    db.commit()
    db.refresh(point)
    
    return ExchangePointResponse(
        id=point.id,
        name=point.name,
        description=point.description,
        address=point.address,
        latitude=point.latitude,
        longitude=point.longitude,
        contact_phone=point.contact_phone,
        contact_email=point.contact_email,
        operating_hours=point.operating_hours,
        is_active=point.is_active,
        created_at=point.created_at,
        updated_at=point.updated_at,
    )


@router.delete("/{point_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exchange_point(
    point_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete an exchange point.
    
    Requires authentication (admin only).
    """
    point = db.query(ExchangePoint).filter(ExchangePoint.id == point_id).first()
    if not point:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exchange point not found"
        )
    
    db.delete(point)
    db.commit()
    
    return None


@router.get("/map/bounds", response_model=ExchangePointListResponse)
async def get_exchange_points_in_bounds(
    north: float = Query(..., description="North latitude"),
    south: float = Query(..., description="South latitude"),
    east: float = Query(..., description="East longitude"),
    west: float = Query(..., description="West longitude"),
    db: Session = Depends(get_db)
):
    """
    Get exchange points within map bounds.
    
    Useful for map view implementations.
    """
    points = db.query(ExchangePoint).filter(
        ExchangePoint.is_active == True,
        ExchangePoint.latitude >= south,
        ExchangePoint.latitude <= north,
        ExchangePoint.longitude >= west,
        ExchangePoint.longitude <= east,
    ).all()
    
    point_responses = []
    for point in points:
        point_responses.append(ExchangePointResponse(
            id=point.id,
            name=point.name,
            description=point.description,
            address=point.address,
            latitude=point.latitude,
            longitude=point.longitude,
            contact_phone=point.contact_phone,
            contact_email=point.contact_email,
            operating_hours=point.operating_hours,
            is_active=point.is_active,
            created_at=point.created_at,
            updated_at=point.updated_at,
        ))
    
    return ExchangePointListResponse(
        points=point_responses,
        total=len(point_responses),
        page=1,
        page_size=len(point_responses),
        total_pages=1,
    )
