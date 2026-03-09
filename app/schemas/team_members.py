from pydantic import BaseModel, ConfigDict
from enum import Enum
from typing import Optional
from datetime import datetime

class UserRights(BaseModel):
    isadmin: bool = False
    can_view_templates: bool = False
    can_edit_template: bool = False
    can_delete_template: bool = False
    can_view_pdf: bool = True
    can_delete_pdf: bool = False
    can_create_pdf: bool = False

class TeamMemberCreate(UserRights):
    username: str
    password: str

class TeamMemberResponse(UserRights):
    id: str
    username: str
    password: str  # Plain text as requested
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TeamMemberUpdateRights(UserRights):
    pass

class TeamMemberUpdatePassword(BaseModel):
    password: str
