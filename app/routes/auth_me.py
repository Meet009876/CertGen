@router.get(
    "/me",
    response_model=UserInfo,
    summary="Get current user information",
    description="Returns the details and rights of the currently authenticated user."
)
async def get_me(current_user=Depends(get_current_active_user)):
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
