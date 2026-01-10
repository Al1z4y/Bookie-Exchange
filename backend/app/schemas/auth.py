"""
Pydantic schemas for authentication and user management.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    """User registration request schema."""
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    """User login request schema."""
    email: EmailStr
    password: str


class UserProfile(BaseModel):
    """User profile response schema."""
    id: int
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    points_balance: int
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    """JWT token response schema."""
    access_token: str
    token_type: str = "bearer"
    user: UserProfile  # Include user profile in token response


class UserProfileUpdate(BaseModel):
    """User profile update request schema."""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


class PasswordChange(BaseModel):
    """Password change request schema."""
    current_password: str
    new_password: str
