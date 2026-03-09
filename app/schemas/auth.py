"""Pydantic schemas for authentication requests and responses."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class LoginRequest(BaseModel):
    """Login request body."""
    username: str = Field(..., min_length=1, max_length=100, description="Username")
    password: str = Field(..., min_length=1, max_length=256, description="Password")


class LoginResponse(BaseModel):
    """Login success response."""
    message: str = "Login successful"
    user: dict = Field(..., description="User info (id, username)")


class LogoutResponse(BaseModel):
    """Logout response."""
    message: str = "Logged out successfully"


class SessionInfo(BaseModel):
    """Session info for debugging/admin."""
    session_id: str
    user_id: str
    username: str
    created_at: datetime
    expires_at: datetime
    ip_address: Optional[str] = None


class UserInfo(BaseModel):
    """User info returned in responses."""
    id: str
    username: str
    is_active: bool
    created_at: datetime
    isadmin: bool
    can_view_templates: bool
    can_edit_template: bool
    can_delete_template: bool
    can_view_pdf: bool
    can_delete_pdf: bool
    can_create_pdf: bool
