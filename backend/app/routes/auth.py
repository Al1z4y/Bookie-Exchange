"""
Authentication and user management routes.
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
from app.models.user import User
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    Token,
    UserProfile,
    UserProfileUpdate,
    PasswordChange,
)

router = APIRouter(prefix="/auth", tags=["authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Get current authenticated user from JWT token.
    """
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    
    return user


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
async def signup(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):
    """
    Register a new user account.
    
    - **username**: Unique username for the account
    - **email**: Valid email address
    - **password**: Password (will be hashed)
    - **full_name**: Optional full name
    """
    try:
        # Check if email already exists (check email first as per requirements)
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already exists"
            )
        
        # Check if username already exists
        existing_user = db.query(User).filter(User.username == user_data.username).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        
        # Validate password length
        if len(user_data.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters long"
            )
        
        # Hash password (get_password_hash handles 72-byte limit automatically)
        hashed_password = get_password_hash(user_data.password)
        
        # Create new user
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            password_hash=hashed_password,
            full_name=user_data.full_name if user_data.full_name else None,
            points_balance=0,  # Start with 0 points
            is_active=True,
            is_admin=False,
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Create access token
        access_token = create_access_token(data={"sub": new_user.username})
        
        # Return token with user profile
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserProfile(
                id=new_user.id,
                username=new_user.username,
                email=new_user.email,
                full_name=new_user.full_name,
                points_balance=new_user.points_balance,
                created_at=new_user.created_at,
                is_active=new_user.is_active,
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/login", response_model=Token)
async def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Login and receive JWT access token.
    
    - **email**: Your email address
    - **password**: Your password
    
    Returns a JWT token and user profile for authenticated requests.
    """
    # Find user by email
    user = db.query(User).filter(User.email == login_data.email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user.username})
    
    # Return token with user profile
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserProfile(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            points_balance=user.points_balance,
            created_at=user.created_at,
            is_active=user.is_active,
        )
    )


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current authenticated user's profile.
    
    Requires authentication via JWT token.
    """
    return UserProfile(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        points_balance=current_user.points_balance,
        created_at=current_user.created_at,
        is_active=current_user.is_active,
    )


@router.put("/me", response_model=UserProfile)
async def update_profile(
    profile_update: UserProfileUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile.
    
    - **full_name**: Update full name
    - **email**: Update email address
    
    Requires authentication.
    """
    # TODO: Update user profile in database
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Update profile endpoint not yet implemented"
    )


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    password_data: PasswordChange,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change user password.
    
    - **current_password**: Current password for verification
    - **new_password**: New password to set
    
    Requires authentication.
    """
    # TODO: Implement password change logic
    # - Verify current password
    # - Hash and update new password
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Change password endpoint not yet implemented"
    )


@router.post("/refresh-token", response_model=Token)
async def refresh_token(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Refresh JWT access token.
    
    Requires valid authentication token.
    """
    # TODO: Generate new token for current user
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Refresh token endpoint not yet implemented"
    )


@router.get("/users", response_model=list[UserProfile])
async def search_users(
    query: str = Query(None, description="Search term for username, email, or full name"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search for users by username or email.
    
    - **query**: Search term (searches username and email)
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 50, max: 100)
    
    Returns list of users (excluding current user).
    Requires authentication.
    """
    from sqlalchemy import or_
    
    users_query = db.query(User).filter(
        User.id != current_user.id,  # Exclude current user
        User.is_active == True  # Only active users
    )
    
    # Search by username or email
    if query:
        search_term = f"%{query}%"
        users_query = users_query.filter(
            or_(
                User.username.ilike(search_term),
                User.email.ilike(search_term),
                User.full_name.ilike(search_term)
            )
        )
    
    # Apply pagination
    offset = (page - 1) * page_size
    users = users_query.order_by(User.username.asc()).offset(offset).limit(page_size).all()
    
    # Convert to response format
    user_profiles = []
    for user in users:
        user_profiles.append(UserProfile(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            points_balance=user.points_balance,
            created_at=user.created_at,
            is_active=user.is_active,
        ))
    
    return user_profiles
