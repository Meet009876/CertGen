from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import Optional
import uuid

from ..schemas.template import (
    TemplateCreate,
    TemplateUpdate,
    TemplateResponse,
    TemplateListResponse,
    TemplateDropdownItem,
    AssetUploadResponse
)
from ..models.database import Template, AssetsData
from ..database import get_db
from ..dependencies.auth_dependency import (
    get_current_user,
    require_view_templates,
    require_edit_template,
    require_delete_template
)
from ..models.auth import User
from ..services.asset_hosting import get_asset_host
import logging
import mimetypes
from typing import List
import os
from typing import List, Annotated
import asyncio

from ..services.uploads import process_file_upload, delete_hosted_asset

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/templates", tags=["Templates"])


@router.post(
    "", 
    response_model=TemplateResponse, 
    status_code=status.HTTP_201_CREATED,
    summary="Create a new PDF template",
    description="Create a new PDF template with base PDF and element configurations"
)
async def create_template(
    template: TemplateCreate, 
    db: Session = Depends(get_db),
    current_user: User = require_edit_template
):
    """
    create_template.
    
    - **name**: Unique template name
    - **base_pdf_width**: PDF width in points
    - **base_pdf_height**: PDF height in points
    - **metadata**: Template elements (static text, variables, images, placeholders)
    """
    # Check for duplicate template name (among active templates)
    existing = db.query(Template).filter(
        Template.name == template.name,
        Template.is_active == True
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Template with name '{template.name}' already exists"
        )
    
    # Create new template
    db_template = Template(
        name=template.name,
        base_pdf_asset_id=template.base_pdf_asset_id,
        base_pdf_width=template.base_pdf_width,
        base_pdf_height=template.base_pdf_height,
        certificate_width=template.certificate_width,
        certificate_height=template.certificate_height,
        elements_data=template.metadata.model_dump(),
        created_by=template.created_by
    )
    
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    
    return db_template


@router.post(
    "/{template_id}/assets",
    response_model=AssetUploadResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload binary assets linked to a template",
    description=(
        "Upserts new/replaced binary assets and cleans up orphaned ones. "
        "Pass `asset_ids` + `files` for new or replaced assets, and `retained_ids` "
        "for asset IDs that are unchanged. Any asset in the DB not in either list is "
        "treated as orphaned and deleted from storage and the database."
    )
)
async def upload_template_assets(
    template_id: uuid.UUID,
    retained_ids: List[str] = Form(default=[]),
    asset_ids: List[str] = Form(default=[]),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = require_edit_template
):
    """
    Payload (multipart/form-data):
    - `asset_ids`    — list of asset IDs for NEW or REPLACED assets (must match `files` order)
    - `files`        — binary files for each new/replaced asset
    - `retained_ids` — list of asset IDs for UNCHANGED assets (no binary needed)

    Backend will:
    1. Upload new/replaced binaries (2 retry attempts each)
    2. Detect orphans = DB assets − (asset_ids + retained_ids) → delete from Dropbox + DB
    """
    if len(asset_ids) != len(files):
        raise HTTPException(status_code=400, detail="The number of asset_ids must match the number of files")

    # Verify template exists
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    asset_host = get_asset_host()
    results = []
    has_success = False
    has_failure = False

    # ── 1. Upload new / replaced assets (2 retry attempts each) ──────────────
    for asset_id, file in zip(asset_ids, files):
        url = None
        error_msg = None

        for attempt in range(1, 3):  # 2 attempts
            try:
                asset_record = db.query(AssetsData).filter(
                    AssetsData.template_id == template_id,
                    AssetsData.asset_id == asset_id
                ).first()

                if not asset_record:
                    asset_record = AssetsData(template_id=template_id, asset_id=asset_id)
                    db.add(asset_record)
                    db.flush()

                file_bytes = await file.read()
                await file.seek(0)  # reset for potential retry

                mime_type = file.content_type or "application/octet-stream"
                ext = mimetypes.guess_extension(mime_type) or ""
                upload_filename = f"{template_id}_{asset_id}{ext}"

                url = await process_file_upload(
                    asset_host=asset_host,
                    file_bytes=file_bytes,
                    upload_filename=upload_filename,
                    mime_type=mime_type
                )

                asset_record.url = url
                has_success = True
                error_msg = None
                break  # success — no need to retry

            except Exception as exc:
                logger.warning(
                    f"Asset upload attempt {attempt}/2 failed for {asset_id}: {exc}"
                )
                error_msg = str(exc)
                if attempt == 2:
                    has_failure = True
                    logger.error(f"Both upload attempts failed for asset {asset_id}", exc_info=True)

        results.append({
            "asset_id": asset_id,
            "status": "success" if url else "failed",
            "url": url,
            "error": error_msg
        })

    db.commit()

    # ── 2. Orphan cleanup ─────────────────────────────────────────────────────
    alive_ids = set(asset_ids) | set(retained_ids)
    # Always protect the base PDF asset — it is managed separately via PUT,
    # not passed in the retained_ids list by the frontend.
    if template.base_pdf_asset_id:
        alive_ids.add(template.base_pdf_asset_id)
    existing_assets = db.query(AssetsData).filter(AssetsData.template_id == template_id).all()
    orphans = [a for a in existing_assets if a.asset_id not in alive_ids]

    for orphan in orphans:
        try:
            # Derive the filename the same way it was built on upload
            # We don't store the filename, so we try common image extensions
            # and fall back to deleting by URL pattern if available
            if orphan.url:
                # Extract filename from the stored URL isn't reliable across providers,
                # so we reconstruct it — same logic used at upload time
                import os
                import mimetypes as _mt
                # Try to guess extension from the URL
                url_path = orphan.url.split("?")[0]
                ext = os.path.splitext(url_path)[1] or ""
                upload_filename = f"{template_id}_{orphan.asset_id}{ext}"
                await delete_hosted_asset(asset_host, upload_filename)
        except Exception as exc:
            logger.warning(f"Could not delete orphaned asset {orphan.asset_id} from storage: {exc}")

        db.delete(orphan)
        logger.info(f"Deleted orphaned asset record: {orphan.asset_id}")

    db.commit()

    # ── 3. Build overall status ───────────────────────────────────────────────
    overall_status = "success"
    if has_failure and has_success:
        overall_status = "partial_success"
    elif has_failure and not has_success:
        overall_status = "failed"

    return {"status": overall_status, "results": results}



@router.get(
    "",
    response_model=List[TemplateDropdownItem],
    summary="List all templates (dropdown)",
    description="Returns a lightweight list of all active templates (id + name) for dropdown selection."
)
async def list_templates(
    db: Session = Depends(get_db),
    current_user: User = require_view_templates
):
    """
    Returns all active templates as a minimal list of id + name pairs.
    Intended for populating dropdown selectors in the frontend.
    """
    templates = (
        db.query(Template.id, Template.name)
        .filter(Template.is_active == True)
        .order_by(Template.name.asc())
        .all()
    )
    return [{"id": t.id, "name": t.name} for t in templates]


def resolve_template_assets(db: Session, template: Template):
    """Helper function to dynamically resolve asset_id to populated URL in template elements"""
    assets = db.query(AssetsData).filter(AssetsData.template_id == template.id).all()
    asset_map = {asset.asset_id: asset.url for asset in assets if asset.url}

    if asset_map and template.elements_data and "elements" in template.elements_data:
        import copy
        resolved_elements_data = copy.deepcopy(template.elements_data)
        
        for element in resolved_elements_data.get("elements", []):
            if element.get("type") == "fixed_image" and "image_url" in element:
                original_url = element["image_url"]
                if original_url in asset_map:
                    element["image_url"] = asset_map[original_url]
        
        template.elements_data = resolved_elements_data
        
    # Also resolve the base_pdf_url if it matches an asset
    template.base_pdf_url = None
    if template.base_pdf_asset_id and asset_map.get(template.base_pdf_asset_id):
        template.base_pdf_url = asset_map[template.base_pdf_asset_id]
        
    return template


@router.get(
    "/{template_id}", 
    response_model=TemplateResponse,
    summary="Get template by ID",
    description="Retrieve a specific template by its UUID and resolve any dynamic asset URLs."
)
async def get_template(
    template_id: uuid.UUID, 
    db: Session = Depends(get_db),
    current_user: User = require_view_templates
):
    """Get a specific template by its ID and resolve asset URLs."""
    template = db.query(Template).filter(Template.id == template_id).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with ID '{template_id}' not found"
        )
    
    return resolve_template_assets(db, template)




@router.put(
    "/{template_id}", 
    response_model=TemplateResponse,
    summary="Update a template",
    description="Update an existing template's properties"
)
async def update_template(
    template_id: uuid.UUID,
    template_update: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = require_edit_template
):
    """
    Update a template.
    Only provided fields will be updated.
    """
    db_template = db.query(Template).filter(Template.id == template_id).first()
    
    if not db_template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with ID '{template_id}' not found"
        )
    
    # Get update data (exclude unset fields)
    update_data = template_update.model_dump(exclude_unset=True)
    
    # Special handling for metadata (convert to elements_data)
    # Note: model_dump() already serialises nested models to dicts in Pydantic v2,
    # so update_data['metadata'] is already a plain dict — no .model_dump() needed.
    if 'metadata' in update_data and update_data['metadata'] is not None:
        update_data['elements_data'] = update_data['metadata']
        del update_data['metadata']
    
    # Check for name uniqueness if name is being updated
    if 'name' in update_data and update_data['name'] != db_template.name:
        existing = db.query(Template).filter(
            Template.name == update_data['name'],
            Template.is_active == True,
            Template.id != template_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Template with name '{update_data['name']}' already exists"
            )
    
    # Apply updates
    for key, value in update_data.items():
        setattr(db_template, key, value)
    
    db.commit()
    db.refresh(db_template)
    
    return resolve_template_assets(db, db_template)


@router.delete(
    "/{template_id}", 
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a template",
    description="Soft delete a template (sets is_active to False)"
)
async def delete_template(
    template_id: uuid.UUID, 
    permanent: bool = Query(False, description="Permanently delete (hard delete)"),
    db: Session = Depends(get_db),
    current_user: User = require_delete_template
):
    """
    Delete a template.
    
    - **Soft delete** (default): Sets is_active to False, template can be recovered
    - **Hard delete** (permanent=true): Permanently removes from database
    """
    db_template = db.query(Template).filter(Template.id == template_id).first()
    
    if not db_template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with ID '{template_id}' not found"
        )
    
    if permanent:
        # Hard delete
        db.delete(db_template)
    else:
        # Soft delete
        db_template.is_active = False
    
    db.commit()
    return None


