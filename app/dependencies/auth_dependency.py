"""
Authentication dependency for FastAPI route protection.

Usage:
    @router.get("/protected")
    async def protected_route(user: User = Depends(get_current_user)):
        return {"message": f"Hello {user.username}"}
"""

from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from ..database import get_db
from ..services.auth_service import AuthService
from ..models.auth import User
from ..config import settings


async def get_current_user(
    request: Request,
    db: DBSession = Depends(get_db)
) -> User:
    """
    FastAPI dependency that validates the session cookie and returns the current user.
    
    Raises HTTPException 401 if:
    - No session cookie present
    - Session key is invalid or expired
    - User is inactive
    """
    session_key = request.cookies.get(settings.SESSION_COOKIE_NAME)
    
    if not session_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please login."
        )
    
    # Validate session
    session = AuthService.validate_session(db, session_key)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please login again."
        )
    
    # Get the user from session
    user = session.user
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive."
        )
    
    return user


def require_permissions(*permissions: str):
    """
    Dependency factory to check if the current user has specific permissions.
    If the user is an admin (`isadmin = True`), they bypass these checks.
    Otherwise, they must have ALL the required permissions set to True.
    """
    async def permission_checker(user: User = Depends(get_current_user)) -> User:
        if user.isadmin:
            return user
            
        missing_permissions = []
        for perm in permissions:
            if not getattr(user, perm, False):
                missing_permissions.append(perm)
                
        if missing_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not have the required permissions: {', '.join(missing_permissions)}"
            )
        return user
        
    return permission_checker

# Explicit dependency instances for routes
require_view_templates = Depends(require_permissions("can_view_templates"))
require_edit_template = Depends(require_permissions("can_edit_template"))
require_delete_template = Depends(require_permissions("can_delete_template"))
require_view_pdf = Depends(require_permissions("can_view_pdf"))
require_create_pdf = Depends(require_permissions("can_create_pdf"))
require_delete_pdf = Depends(require_permissions("can_delete_pdf"))
