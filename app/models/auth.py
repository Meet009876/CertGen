"""
Authentication models: User and Session tables.

- User: stores credentials (plain text password for testing)
- Session: stores active sessions only (deleted on logout or expiry)
"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from .database import GUID
from ..database import Base


class User(Base):
    """User model for authentication."""
    __tablename__ = "users"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password = Column(String(256), nullable=False)  # Plain text for now
    is_active = Column(Boolean, default=True, index=True)
    
    # Permissions
    isadmin = Column(Boolean, default=False, index=True)
    can_view_templates = Column(Boolean, default=False)
    can_edit_template = Column(Boolean, default=False)
    can_delete_template = Column(Boolean, default=False)
    can_view_pdf = Column(Boolean, default=True)
    can_delete_pdf = Column(Boolean, default=False)
    can_create_pdf = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship to sessions
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}')>"


class Session(Base):
    """
    Active session model.
    
    Only active sessions are stored. Entries are deleted when:
    - User logs out
    - Session expires (after 7 days)
    """
    __tablename__ = "sessions"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    session_key = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    ip_address = Column(String(45), nullable=True)
    location = Column(String(255), nullable=True)  # Added for IP Geolocation
    user_agent = Column(Text, nullable=True)
    
    # Relationship to user
    user = relationship("User", back_populates="sessions")
    
    def __repr__(self):
        return f"<Session(id={self.id}, user_id={self.user_id}, expires_at={self.expires_at})>"
