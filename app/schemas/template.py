from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import List, Optional
from datetime import datetime
import uuid

from .elements import Element


class TemplateMetadata(BaseModel):
    """Template metadata containing all elements"""
    elements: List[Element] = Field(default_factory=list)
    
    @field_validator('elements')
    @classmethod
    def validate_element_ids_unique(cls, elements: List[Element]) -> List[Element]:
        """Ensure all element IDs are unique within the template"""
        ids = [elem.id for elem in elements]
        if len(ids) != len(set(ids)):
            raise ValueError("All element IDs must be unique within a template")
        return elements
    
    @field_validator('elements')
    @classmethod
    def validate_variable_names_unique(cls, elements: List[Element]) -> List[Element]:
        """Ensure all text variable names are unique"""
        from .elements import TextVariableElement
        variable_names = [
            elem.content 
            for elem in elements 
            if isinstance(elem, TextVariableElement)
        ]
        if len(variable_names) != len(set(variable_names)):
            raise ValueError("All text variable names must be unique within a template")
        return elements
    
    @field_validator('elements')
    @classmethod
    def validate_placeholder_names_unique(cls, elements: List[Element]) -> List[Element]:
        """Ensure all image placeholder names are unique"""
        from .elements import ImagePlaceholderElement
        placeholder_names = [
            elem.image_url 
            for elem in elements 
            if isinstance(elem, ImagePlaceholderElement)
        ]
        if len(placeholder_names) != len(set(placeholder_names)):
            raise ValueError("All image placeholder names must be unique within a template")
        return elements
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "elements": [
                    {
                        "type": "static_text",
                        "position": {"x": 50, "y": 750},
                        "content": "Invoice",
                        "formatting": {"font_size": 24, "bold": True}
                    },
                    {
                        "type": "text_variable",
                        "position": {"x": 50, "y": 700},
                        "variable_name": "invoice_number",
                        "formatting": {"font_size": 12}
                    }
                ]
            }
        }
    )


class TemplateCreate(BaseModel):
    """Schema for creating a new template"""
    name: str = Field(..., min_length=1, max_length=255, description="Template name")
    base_pdf_asset_id: Optional[str] = Field(default=None, description="Asset ID for the base PDF")
    base_pdf_width: float = Field(..., gt=0, description="PDF width in points")
    base_pdf_height: float = Field(..., gt=0, description="PDF height in points")
    certificate_width: Optional[float] = Field(default=None, gt=0, description="Certificate width in pixels")
    certificate_height: Optional[float] = Field(default=None, gt=0, description="Certificate height in pixels")
    metadata: TemplateMetadata = Field(default_factory=TemplateMetadata)
    created_by: Optional[uuid.UUID] = Field(default=None, description="User ID who created template")
    

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Invoice Template",
                "base_pdf_asset_id": "pdf_12345",
                "base_pdf_width": 612.0,
                "base_pdf_height": 792.0,
                "certificate_width": 1200.0,
                "certificate_height": 800.0,
                "metadata": {
                    "elements": []
                }
            }
        }
    )


class TemplateUpdate(BaseModel):
    """Schema for updating an existing template"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    base_pdf_asset_id: Optional[str] = None
    base_pdf_width: Optional[float] = Field(None, gt=0)
    base_pdf_height: Optional[float] = Field(None, gt=0)
    certificate_width: Optional[float] = Field(None, gt=0)
    certificate_height: Optional[float] = Field(None, gt=0)
    metadata: Optional[TemplateMetadata] = None
    is_active: Optional[bool] = None
    

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Updated Invoice Template",
                "metadata": {
                    "elements": []
                }
            }
        }
    )


class TemplateResponse(BaseModel):
    """Schema for template responses"""
    id: uuid.UUID
    name: str
    base_pdf_asset_id: Optional[str] = None
    base_pdf_url: Optional[str] = None
    base_pdf_width: float
    base_pdf_height: float
    certificate_width: Optional[float] = None
    certificate_height: Optional[float] = None
    metadata: TemplateMetadata = Field(alias='elements_data')
    created_at: datetime
    updated_at: datetime
    created_by: Optional[uuid.UUID]
    is_active: bool
    
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Invoice Template",
                "base_pdf_url": "https://storage.example.com/templates/invoice.pdf",
                "base_pdf_width": 612.0,
                "base_pdf_height": 792.0,
                "certificate_width": 1200.0,
                "certificate_height": 800.0,
                "metadata": {"elements": []},
                "created_at": "2026-02-15T00:00:00Z",
                "updated_at": "2026-02-15T00:00:00Z",
                "created_by": None,
                "is_active": True
            }
        }
    )


class TemplateDropdownItem(BaseModel):
    """Lightweight template item for dropdown lists"""
    id: uuid.UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class TemplateListResponse(BaseModel):
    """Schema for paginated list of templates"""
    templates: List[TemplateResponse]
    total: int = Field(..., description="Total number of templates matching filter")
    page: int = Field(..., ge=1, description="Current page number")
    page_size: int = Field(..., ge=1, le=100, description="Number of items per page")
    total_pages: int = Field(..., description="Total number of pages")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "templates": [],
                "total": 0,
                "page": 1,
                "page_size": 10,
                "total_pages": 0
            }
        }
    )


class AssetUploadResult(BaseModel):
    """Result of uploading a single asset"""
    asset_id: str
    status: str = Field(..., description="'success' or 'failed'")
    url: Optional[str] = Field(None, description="Final hosted URL if successful")
    error: Optional[str] = Field(None, description="Error message if failed")

class AssetUploadResponse(BaseModel):
    """Response containing the status of all uploaded assets"""
    status: str = Field(..., description="'success' or 'partial_success' or 'failed'")
    results: List[AssetUploadResult]
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "partial_success",
                "results": [
                    {
                        "asset_id": "img_123",
                        "status": "success",
                        "url": "https://dropbox.com/s/sample/image.png",
                        "error": None
                    },
                    {
                        "asset_id": "img_456",
                        "status": "failed",
                        "url": None,
                        "error": "Upload timed out"
                    }
                ]
            }
        }
    )
