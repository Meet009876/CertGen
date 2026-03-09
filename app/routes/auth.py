"""
Authentication routes: Login and Logout only.
No registration. No forgot password.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session as DBSession
import logging

from ..database import get_db
from ..schemas.auth import LoginRequest, LoginResponse, LogoutResponse, UserInfo
from ..services.auth_service import AuthService
from ..dependencies.auth_dependency import get_current_user
from ..config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Login with username and password",
    description="Authenticates user and creates a session. Session ID is set as HttpOnly cookie."
)
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    db: DBSession = Depends(get_db)
):
    """
    Login endpoint.
    
    - Verifies username and password
    - Creates a session entry in the database
    - Sets session cookie (HttpOnly, 7-day expiry)
    """
    # Authenticate
    user = AuthService.authenticate_user(db, body.username, body.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Get client info for session
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:256]
    
    # Create session
    session_key = await AuthService.create_session(
        db=db,
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    # Set cookie
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_key,
        max_age=settings.SESSION_MAX_AGE,
        httponly=settings.SESSION_COOKIE_HTTPONLY,
        samesite=settings.SESSION_COOKIE_SAMESITE,
        secure=settings.SESSION_COOKIE_SECURE,
        path="/"
    )
    
    logger.info(f"User logged in: {user.username}")
    
    return LoginResponse(
        message="Login successful",
        user={
            "id": str(user.id),
            "username": user.username,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "isadmin": user.isadmin,
            "can_view_templates": user.can_view_templates,
            "can_edit_template": user.can_edit_template,
            "can_delete_template": user.can_delete_template,
            "can_view_pdf": user.can_view_pdf,
            "can_delete_pdf": user.can_delete_pdf,
            "can_create_pdf": user.can_create_pdf
        }
    )


@router.post(
    "/logout",
    response_model=LogoutResponse,
    summary="Logout and destroy session",
    description="Deletes the session from database and clears the session cookie."
)
async def logout(
    request: Request,
    response: Response,
    db: DBSession = Depends(get_db)
):
    """
    Logout endpoint.
    
    - Deletes session from database
    - Clears session cookie
    """
    session_key = request.cookies.get(settings.SESSION_COOKIE_NAME)
    
    if session_key:
        AuthService.delete_session(db, session_key)
    
    # Clear cookie
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/"
    )
    
    logger.info("User logged out")
    
    return LogoutResponse(message="Logged out successfully")


@router.get(
    "/me",
    response_model=UserInfo,
    summary="Get current user information",
    description="Returns the details and rights of the currently authenticated user."
)
async def get_me(current_user=Depends(get_current_user)):
    """
    Get current logged in user details.
    """
    return UserInfo(
        id=str(current_user.id),
        username=current_user.username,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        isadmin=current_user.isadmin,
        can_view_templates=current_user.can_view_templates,
        can_edit_template=current_user.can_edit_template,
        can_delete_template=current_user.can_delete_template,
        can_view_pdf=current_user.can_view_pdf,
        can_delete_pdf=current_user.can_delete_pdf,
        can_create_pdf=current_user.can_create_pdf
    )
