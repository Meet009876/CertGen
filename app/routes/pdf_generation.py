from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional
import uuid
import logging
import base64

from ..schemas.pdf_generation import GeneratePDFRequest
from ..models.database import Template
from ..models.certificate import Certificate
from ..database import get_db
from ..services.pdf_engine import get_pdf_generator
from ..services.asset_hosting import get_asset_host
from ..services.uploads import process_file_upload, delete_hosted_asset
from datetime import datetime
from ..dependencies.auth_dependency import (
    get_current_user,
    require_view_pdf,
    require_create_pdf,
    require_delete_pdf
)
from ..models.auth import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pdf", tags=["PDF Generation"])


@router.get(
    "/stored",
    summary="List stored PDFs",
    description="List all PDFs stored locally, optionally filtered by date"
)
async def list_stored_pdfs(
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = require_view_pdf
):
    """
    List all stored PDF files.
    
    - **date**: Optional date filter (YYYY-MM-DD format)
    """
    try:
        query = db.query(Certificate)
        # We can optionally filter by date if needed, but for now returning all sorted
        certs = query.order_by(Certificate.created_at.desc()).all()
        pdfs = [
            {
                "certificate_number": c.certificate_number,
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in certs
        ]
        return pdfs
    except Exception as e:
        logger.error(f"Failed to list PDFs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list stored PDFs"
        )


@router.get(
    "/stored/{certificate_number}",
    summary="Retrieve stored PDF",
    description="Get the public URL for a previously generated PDF"
)
async def get_stored_pdf(
    certificate_number: str,
    db: Session = Depends(get_db),
    current_user: User = require_view_pdf
):
    """
    Retrieve a stored PDF file URL.
    
    - **certificate_number**: The unique certificate identifier
    """
    try:
        cert = db.query(Certificate).filter(Certificate.certificate_number == certificate_number).first()
        
        if cert is None or not cert.url:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Certificate not found"
            )
        
        return {"certificate_number": cert.certificate_number, "url": cert.url}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve PDF: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve PDF"
        )


@router.post(
    "/generate",
    response_class=Response,
    status_code=status.HTTP_200_OK,
    summary="Generate PDF from template",
    description="Generate a PDF file from a template with dynamic data (variables and images)"
)
async def generate_pdf(
    request: GeneratePDFRequest,
    db: Session = Depends(get_db),
    current_user: User = require_create_pdf
):
    """
    Generate a PDF from a template with dynamic content.
    
    - **template_id**: UUID of the template to use
    - **variables**: Map of variable_name -> value for text variables (must include 'certificate_number')
    - **placeholder_images**: Map of placeholder_name -> image_url for image placeholders
    
    Returns the generated PDF file as application/pdf.
    """
    try:
        if not request.variables or "certificate_number" not in request.variables:
            raise ValueError("The 'certificate_number' must be provided in the variables dictionary.")
        
        certificate_number = request.variables["certificate_number"].strip()
        if not certificate_number:
            raise ValueError("The 'certificate_number' cannot be empty.")

        # Get template from database
        template_uuid = uuid.UUID(request.template_id)
        template = db.query(Template).filter(
            Template.id == template_uuid,
            Template.is_active == True
        ).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Template with ID '{request.template_id}' not found or inactive"
            )

        # Check for existing certificate early to avoid generating PDF unnecessarily
        existing_cert = db.query(Certificate).filter(Certificate.certificate_number == certificate_number).first()
        if existing_cert:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Certificate with number '{certificate_number}' already exists."
            )
            
        # Resolve asset URLs (replace asset_id placeholders with fresh storage URLs)
        from ..routes.templates import resolve_template_assets
        template = resolve_template_assets(db, template)
        
        # Prepare template data for PDF generation
        template_data = {
            "base_pdf_url": template.base_pdf_url,
            "base_pdf_width": template.base_pdf_width,
            "base_pdf_height": template.base_pdf_height,
            "metadata": template.elements_data  # Use elements_data column directly
        }
        
        asset_host = get_asset_host()
        hosted_placeholder_images = {}
        if request.placeholder_images:
            for ph_name, ph_data in request.placeholder_images.items():
                if ph_data.startswith("data:"):
                    try:
                        if "," in ph_data:
                            header, encoded = ph_data.split(",", 1)
                            mime_type = header.split(":")[1].split(";")[0] if ":" in header and ";" in header else "image/png"
                        else:
                            encoded = ph_data
                            mime_type = "image/png"
                        
                        file_bytes = base64.b64decode(encoded)
                        asset_id = f"{uuid.uuid4().hex}"
                        ph_filename = f"{asset_id}.png"

                        logger.info(f"Uploading placeholder '{ph_name}' to cloud storage")
                        ph_url = await process_file_upload(
                            asset_host=asset_host,
                            file_bytes=file_bytes,
                            upload_filename=ph_filename,
                            mime_type=mime_type
                        )
                        hosted_placeholder_images[ph_name] = {
                            "url": ph_url,
                            "asset_id": asset_id
                        }
                    except Exception as e:
                        logger.error(f"Failed to upload placeholder image {ph_name}: {e}")
                        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to upload placeholder image {ph_name} to cloud storage")
                else:
                    hosted_placeholder_images[ph_name] = {
                        "url": ph_data,
                        "asset_id": None
                    }
        
        # Generate PDF using configured engine
        PDFGenerator = get_pdf_generator()
        logger.info(f"Generating PDF for template: {template.name}")
        pdf_bytes = await PDFGenerator.generate_pdf(
            template_data=template_data,
            variables=request.variables,
            placeholder_images=hosted_placeholder_images,
            certificate_width=template.certificate_width,
            certificate_height=template.certificate_height,
        )
        
        # Generate filename using certificate number
        clean_cert_number = "".join(c if c.isalnum() or c in ('-', '_') else '_' for c in certificate_number)
        filename = f"{clean_cert_number}.pdf"

        # Save PDF to cloud storage
        logger.info(f"Uploading PDF to cloud storage")
        try:
            asset_host = get_asset_host()
            public_url = await process_file_upload(
                asset_host=asset_host,
                file_bytes=pdf_bytes,
                upload_filename=filename,
                mime_type="application/pdf"
            )
        except Exception as e:
            logger.error(f"Failed to upload PDF: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to upload PDF to cloud storage")

        # Save certificate in DB
        try:
            new_cert = Certificate(
                certificate_number=certificate_number,
                template_id=template.id,
                url=public_url,
                certificate_data={
                    "variables": request.variables,
                    "placeholder_images": hosted_placeholder_images
                }
            )
            db.add(new_cert)
            db.commit()
            logger.info(f"Certificate saved to DB: {filename}")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to save certificate to DB: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save certificate record to database")
        
        # Return PDF as response with cloud URL in headers
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "X-PDF-URL": public_url,
                "X-Certificate-Number": certificate_number
            }
        )
    
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF. Please check server logs."
        )


@router.delete(
    "/stored/{certificate_number}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete stored PDF",
    description="Delete a previously generated PDF and its certificate record"
)
async def delete_stored_pdf(
    certificate_number: str,
    db: Session = Depends(get_db),
    current_user: User = require_delete_pdf
):
    """
    Delete a stored PDF file and its certificate record.
    
    - **certificate_number**: PDF filename / certificate number
    """
    cert = db.query(Certificate).filter(Certificate.certificate_number == certificate_number).first()
    if not cert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")
        
    try:
        asset_host = get_asset_host()
        
        # 1. Delete all associated placeholder images
        cert_data = cert.certificate_data or {}
        placeholder_images = cert_data.get("placeholder_images", {})
        for key, img_data in placeholder_images.items():
            if isinstance(img_data, dict):
                asset_id = img_data.get("asset_id")
                if asset_id:
                    try:
                        logger.info(f"Deleting associated asset: {asset_id}")
                        await delete_hosted_asset(asset_host, f"{asset_id}.png")
                    except Exception as e:
                        logger.warning(f"Failed to delete associated asset {asset_id}: {e}")
                        
        # 2. Delete the main PDF using the sanitized filename that was uploaded
        clean_cert_number = "".join(c if c.isalnum() or c in ('-', '_') else '_' for c in cert.certificate_number)
        await delete_hosted_asset(asset_host, f"{clean_cert_number}.pdf")
        
        db.delete(cert)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete PDF {certificate_number}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete PDF")
        
    logger.info(f"User {current_user.username} deleted PDF: {certificate_number}")
    return None

@router.get(
    "/edit/{certificate_number}",
    summary="Get certificate data for editing",
    description="Retrieve the stored certificate data (variables, placeholder images) and template ID to allow editing"
)
async def get_certificate_for_edit(
    certificate_number: str,
    db: Session = Depends(get_db),
    current_user: User = require_view_pdf
):
    """
    Get certificate data for editing a generated PDF.
    """
    try:
        cert = db.query(Certificate).filter(Certificate.certificate_number == certificate_number).first()
        
        if cert is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Certificate not found"
            )
            
        data = cert.certificate_data or {}
        
        return {
            "certificate_number": cert.certificate_number,
            "template_id": str(cert.template_id) if cert.template_id else None,
            "variables": data.get("variables", {}),
            "placeholder_images": data.get("placeholder_images", {})
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve certificate for editing: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve certificate data"
        )


@router.put(
    "/edit/{certificate_number}",
    response_class=Response,
    status_code=status.HTTP_200_OK,
    summary="Update generated PDF",
    description="Update a previously generated PDF with new data"
)
async def update_pdf(
    certificate_number: str,
    request: GeneratePDFRequest,
    db: Session = Depends(get_db),
    current_user: User = require_create_pdf
):
    """
    Update a generated PDF with new content (variables and modified images).
    """
    try:
        # 1. Fetch existing certificate
        cert = db.query(Certificate).filter(Certificate.certificate_number == certificate_number).first()
        if not cert:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")
            
        existing_data = cert.certificate_data or {}
        existing_images_db = existing_data.get("placeholder_images", {})
        
        # 2. Extract requested changes
        new_variables = request.variables or {}
        image_payload = request.placeholder_images or {}
        
        # Handle the structure {'existing': ['logo'], 'replaced': {'signature': 'data:...'}}
        existing_keys = image_payload.get("existing", [])
        replaced_images = image_payload.get("replaced", {})
        
        asset_host = get_asset_host()
        updated_placeholder_images = {}
        
        # 3. Handle 'existing' images (copy them over as they are)
        for key in existing_keys:
            if key in existing_images_db:
                updated_placeholder_images[key] = existing_images_db[key]
                
        # 4. Handle 'replaced' images
        for key, new_data in replaced_images.items():
            # A) Delete the old asset from cloud if it existed
            if key in existing_images_db:
                old_asset_id = existing_images_db[key].get("asset_id")
                if old_asset_id:
                    try:
                        logger.info(f"Deleting replaced asset: {old_asset_id}")
                        await delete_hosted_asset(asset_host, f"{old_asset_id}.png")
                    except Exception as e:
                        logger.warning(f"Failed to delete old asset {old_asset_id}: {e}")
            
            # B) Upload the new binary image
            if new_data.startswith("data:"):
                try:
                    if "," in new_data:
                        header, encoded = new_data.split(",", 1)
                        # Extract mime type safely from header (e.g., "data:image/png;base64")
                        mime_type = "image/png"
                        if ":" in header and ";" in header:
                            parts = header.split(":")
                            if len(parts) > 1:
                                mime_parts = parts[1].split(";")
                                if len(mime_parts) > 0:
                                    mime_type = mime_parts[0]
                    else:
                        encoded = new_data
                        mime_type = "image/png"
                        
                    file_bytes = base64.b64decode(encoded)
                    new_asset_id = f"{uuid.uuid4().hex}"
                    ph_filename = f"{new_asset_id}.png"

                    logger.info(f"Uploading replaced placeholder '{key}' to cloud storage")
                    new_url = await process_file_upload(
                        asset_host=asset_host,
                        file_bytes=file_bytes,
                        upload_filename=ph_filename,
                        mime_type=mime_type
                    )
                    updated_placeholder_images[key] = {
                        "url": new_url,
                        "asset_id": new_asset_id
                    }
                except Exception as e:
                    logger.error(f"Failed to upload replaced image {key}: {e}")
                    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to upload replaced image {key}")

        # 5. Get the template data for regeneration
        template_uuid = cert.template_id
        template = db.query(Template).filter(Template.id == template_uuid).first()
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
            
        from ..routes.templates import resolve_template_assets
        template = resolve_template_assets(db, template)
        
        template_data = {
            "base_pdf_url": template.base_pdf_url,
            "base_pdf_width": template.base_pdf_width,
            "base_pdf_height": template.base_pdf_height,
            "metadata": template.elements_data
        }

        # 6. Generate the new PDF
        PDFGenerator = get_pdf_generator()
        logger.info(f"Regenerating PDF for certificate: {certificate_number}")
        
        pdf_bytes = await PDFGenerator.generate_pdf(
            template_data=template_data,
            variables=new_variables,
            placeholder_images=updated_placeholder_images,
            certificate_width=template.certificate_width,
            certificate_height=template.certificate_height,
        )
        
        # 7. Replace the old PDF in cloud storage
        clean_cert_number = "".join(c if c.isalnum() or c in ('-', '_') else '_' for c in certificate_number)
        filename = f"{clean_cert_number}.pdf"

        # Attempt to delete the old PDF first to prevent Dropbox creating duplicate '(1)' files
        try:
            logger.info(f"Deleting existing PDF from cloud storage before replacing: {filename}")
            await delete_hosted_asset(asset_host, filename)
        except Exception as e:
            logger.warning(f"Failed to delete existing PDF {filename} (it might not exist): {e}")

        try:
            logger.info("Uploading regenerated PDF to cloud storage")
            public_url = await process_file_upload(
                asset_host=asset_host,
                file_bytes=pdf_bytes,
                upload_filename=filename,
                mime_type="application/pdf"
            )
        except Exception as e:
            logger.error(f"Failed to upload updated PDF: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to upload updated PDF")

        # 8. Update DB Record
        try:
            cert.url = public_url
            cert.certificate_data = {
                "variables": new_variables,
                "placeholder_images": updated_placeholder_images
            }
            # updated_at will auto-update
            
            db.commit()
            logger.info(f"Certificate updated in DB: {filename}")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to update certificate in DB: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update database record")

        # 9. Return the new PDF content
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "X-PDF-URL": public_url,
                "X-Certificate-Number": certificate_number
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update PDF: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update PDF"
        )
