"""
Authentication service for session-based auth.

Handles:
- User credential verification
- Session creation, validation, and deletion
- Expired session cleanup
- Default admin user seeding
"""

import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session as DBSession

from ..models.auth import User, Session
from ..config import settings

logger = logging.getLogger(__name__)


class AuthService:
    """Service for authentication operations."""
    
    @staticmethod
    def authenticate_user(db: DBSession, username: str, password: str) -> Optional[User]:
        """
        Verify user credentials.
        
        Args:
            db: Database session
            username: Username to check
            password: Plain text password to verify
            
        Returns:
            User object if credentials valid, None otherwise
        """
        user = db.query(User).filter(
            User.username == username,
            User.is_active == True
        ).first()
        
        if not user:
            logger.warning(f"Login attempt for non-existent user: {username}")
            return None
        
        # Plain text comparison (for testing — switch to bcrypt for production)
        if user.password != password:
            logger.warning(f"Invalid password for user: {username}")
            return None
        
        logger.info(f"User authenticated: {username}")
        return user
    
    @staticmethod
    async def create_session(
        db: DBSession,
        user_id,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> str:
        """
        Create a new session for authenticated user.
        
        Args:
            db: Database session
            user_id: UUID of the authenticated user
            ip_address: Client IP address
            user_agent: Client user agent string
            
        Returns:
            Session key (64-char hex string)
        """
        # Generate cryptographic random session key
        session_key = secrets.token_hex(32)  # 64-char hex = 256-bit random
        
        # Calculate expiration
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.SESSION_MAX_AGE)
        
        # Resolve Location from IP (if public IP)
        location = "Unknown"
        if ip_address and ip_address not in ["127.0.0.1", "localhost", "::1"]:
            try:
                import httpx
                # Use a short timeout to prevent blocking login
                async with httpx.AsyncClient(timeout=2.0) as client:
                    resp = await client.get(f"http://ip-api.com/json/{ip_address}")
                    if resp.status_code == 200:
                        data = resp.json()
                        if data.get("status") == "success":
                            city = data.get("city", "")
                            country = data.get("country", "")
                            location = f"{city}, {country}".strip(", ")
            except Exception as e:
                logger.warning(f"Failed to resolve location for IP {ip_address}: {e}")
        elif ip_address in ["127.0.0.1", "localhost", "::1"]:
            location = "Localhost"
        
        # Create session entry
        session = Session(
            session_key=session_key,
            user_id=user_id,
            expires_at=expires_at,
            ip_address=ip_address,
            location=location,
            user_agent=user_agent
        )
        
        db.add(session)
        db.commit()
        
        logger.info(f"Session created for user {user_id} at {location}")
        return session_key
    
    @staticmethod
    def validate_session(db: DBSession, session_key: str) -> Optional[Session]:
        """
        Validate a session key. Returns session if active and not expired.
        
        Args:
            db: Database session
            session_key: Session key from cookie
            
        Returns:
            Session object if valid, None otherwise
        """
        session = db.query(Session).filter(
            Session.session_key == session_key
        ).first()
        
        if not session:
            return None
        
        # Check if expired
        now = datetime.now(timezone.utc)
        
        # Handle timezone-naive expires_at (SQLite stores without tz)
        expires_at = session.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        if now > expires_at:
            # Session expired — delete it
            logger.info(f"Session expired for user {session.user_id}, deleting")
            db.delete(session)
            db.commit()
            return None
        
        return session
    
    @staticmethod
    def delete_session(db: DBSession, session_key: str) -> bool:
        """
        Delete a session (logout).
        
        Args:
            db: Database session
            session_key: Session key to delete
            
        Returns:
            True if session was found and deleted
        """
        session = db.query(Session).filter(
            Session.session_key == session_key
        ).first()
        
        if session:
            db.delete(session)
            db.commit()
            logger.info(f"Session deleted for user {session.user_id}")
            return True
        
        return False
    
    @staticmethod
    def cleanup_expired_sessions(db: DBSession) -> int:
        """
        Delete all expired sessions from the database.
        
        Returns:
            Number of sessions deleted
        """
        now = datetime.now(timezone.utc)
        expired = db.query(Session).filter(Session.expires_at < now).all()
        count = len(expired)
        
        for session in expired:
            db.delete(session)
        
        if count > 0:
            db.commit()
            logger.info(f"Cleaned up {count} expired sessions")
        
        return count
    
    @staticmethod
    def seed_default_admin(db: DBSession) -> Optional[User]:
        """
        Create default admin user if no users exist.
        
        Returns:
            Created user or None if users already exist
        """
        existing_users = db.query(User).count()
        
        if existing_users > 0:
            logger.info(f"Users already exist ({existing_users}), skipping admin seed")
            return None
        
        admin = User(
            username=settings.DEFAULT_ADMIN_USERNAME,
            password=settings.DEFAULT_ADMIN_PASSWORD,
            is_active=True
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        logger.info(f"Default admin user created: {admin.username}")
        return admin
