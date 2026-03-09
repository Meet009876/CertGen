from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session as DBSession
from typing import List
import uuid

from ..database import get_db
from ..models.auth import User, Session
from ..dependencies.auth_dependency import get_current_user
from ..schemas.team_members import TeamMemberResponse, TeamMemberCreate, TeamMemberUpdateRights, TeamMemberUpdatePassword

router = APIRouter(prefix="/api/teamMembers", tags=["Team Members"])

def require_admin(current_user: User = Depends(get_current_user)):
    """Dependency to ensure the current authenticated user is an admin."""
    if not current_user.isadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user

@router.get(
    "",
    response_model=List[TeamMemberResponse],
    summary="Get all team members",
    description="Fetch a list of all users, their plain text passwords, and rights. Access restricted to Admins."
)
def get_all_team_members(
    db: DBSession = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    users = db.query(User).all()
    # Pydantic via from_attributes=True will automatically handle mapping User UUID to the string id
    return [
        {
            **user.__dict__,
            'id': str(user.id)
        } for user in users
    ]

@router.post(
    "",
    response_model=TeamMemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new team member",
    description="Create a new user with a specific password and set of rights. Access restricted to Admins."
)
def create_team_member(
    user_in: TeamMemberCreate,
    db: DBSession = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    # Check if user exists
    user = db.query(User).filter(User.username == user_in.username).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this username already exists in the system."
        )

    # Create new user
    new_user = User(
        username=user_in.username,
        password=user_in.password,
        is_active=True,
        isadmin=user_in.isadmin,
        can_view_templates=user_in.can_view_templates,
        can_edit_template=user_in.can_edit_template,
        can_delete_template=user_in.can_delete_template,
        can_view_pdf=user_in.can_view_pdf,
        can_delete_pdf=user_in.can_delete_pdf,
        can_create_pdf=user_in.can_create_pdf
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Needs explicit dictionary mapping for the ID conversion to string in FastAPI response payload
    resp = new_user.__dict__.copy()
    resp['id'] = str(new_user.id)
    return resp

@router.patch(
    "/{user_id}/rights",
    response_model=TeamMemberResponse,
    summary="Update team member rights",
    description="Update an existing user's right flags. Access restricted to Admins."
)
def update_team_member_rights(
    user_id: str,
    rights_in: TeamMemberUpdateRights,
    db: DBSession = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    try:
        parsed_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format")

    user = db.query(User).filter(User.id == parsed_uuid).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Update only rights
    user.isadmin = rights_in.isadmin
    user.can_view_templates = rights_in.can_view_templates
    user.can_edit_template = rights_in.can_edit_template
    user.can_delete_template = rights_in.can_delete_template
    user.can_view_pdf = rights_in.can_view_pdf
    user.can_delete_pdf = rights_in.can_delete_pdf
    user.can_create_pdf = rights_in.can_create_pdf

    db.commit()
    db.refresh(user)

    # Invalidate all existing sessions for this user
    db.query(Session).filter(Session.user_id == parsed_uuid).delete()
    db.commit()
    db.refresh(user)

    resp = user.__dict__.copy()
    resp['id'] = str(user.id)
    return resp

@router.patch(
    "/{user_id}/password",
    response_model=TeamMemberResponse,
    summary="Reset team member password",
    description="Reset an existing user's password. Access restricted to Admins."
)
def update_team_member_password(
    user_id: str,
    password_in: TeamMemberUpdatePassword,
    db: DBSession = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    try:
        parsed_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format")

    user = db.query(User).filter(User.id == parsed_uuid).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.password = password_in.password
    db.commit()
    db.refresh(user)

    # Invalidate all existing sessions for this user
    db.query(Session).filter(Session.user_id == parsed_uuid).delete()
    db.commit()
    db.refresh(user)

    resp = user.__dict__.copy()
    resp['id'] = str(user.id)
    return resp

@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a team member",
    description="Permanently delete a user and all their active sessions. Access restricted to Admins. Admins cannot delete themselves."
)
def delete_team_member(
    user_id: str,
    db: DBSession = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    try:
        parsed_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format")

    if parsed_uuid == current_admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account.")

    user = db.query(User).filter(User.id == parsed_uuid).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Delete all sessions for this user first (FK constraint)
    db.query(Session).filter(Session.user_id == parsed_uuid).delete()
    db.delete(user)
    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
