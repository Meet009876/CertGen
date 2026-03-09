from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Literal, Optional, Union
from enum import Enum
import uuid


# Enums for validation
class FontFamily(str, Enum):
    """Available font families for text elements"""
    HELVETICA = "Helvetica"
    HELVETICA_BOLD = "Helvetica-Bold"
    HELVETICA_OBLIQUE = "Helvetica-Oblique"
    HELVETICA_BOLD_OBLIQUE = "Helvetica-BoldOblique"
    TIMES_ROMAN = "Times-Roman"
    TIMES_BOLD = "Times-Bold"
    TIMES_ITALIC = "Times-Italic"
    TIMES_BOLD_ITALIC = "Times-BoldItalic"
    COURIER = "Courier"
    COURIER_BOLD = "Courier-Bold"
    COURIER_OBLIQUE = "Courier-Oblique"
    COURIER_BOLD_OBLIQUE = "Courier-BoldOblique"


class TextAlignment(str, Enum):
    """Text alignment options"""
    LEFT = "left"
    CENTER = "center"
    RIGHT = "right"
    JUSTIFY = "justify"


class ElementType(str, Enum):
    """Types of elements that can be added to a template"""
    STATIC_TEXT = "static_text"
    TEXT_VARIABLE = "text_variable"
    FIXED_IMAGE = "fixed_image"
    IMAGE_PLACEHOLDER = "image_placeholder"


# Base models
class Position(BaseModel):
    """
    Position in PDF coordinate system (points, bottom-left origin).
    Frontend should convert from pixels to points before sending.
    """
    x: float = Field(..., ge=0, description="X coordinate in PDF points")
    y: float = Field(..., ge=0, description="Y coordinate in PDF points")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {"x": 100.0, "y": 200.0}
        }
    )


class TextFormatting(BaseModel):
    """Comprehensive text formatting options"""
    font_family: FontFamily = Field(default=FontFamily.HELVETICA)
    font_size: float = Field(default=12.0, gt=0, le=200, description="Font size in points")
    bold: bool = Field(default=False, description="Bold text (uses bold font variant)")
    italic: bool = Field(default=False, description="Italic text (uses oblique/italic variant)")
    underline: bool = Field(default=False)
    color: str = Field(
        default="#000000", 
        pattern=r'^#[0-9A-Fa-f]{6}$',
        description="Hex color code (e.g., #FF0000 for red)"
    )
    alignment: TextAlignment = Field(default=TextAlignment.LEFT)
    line_height: float = Field(
        default=1.2, 
        ge=0.5, 
        le=3.0, 
        description="Line height multiplier"
    )
    letter_spacing: float = Field(
        default=0.0, 
        ge=-5.0, 
        le=20.0, 
        description="Letter spacing in points (tracking)"
    )
    rotation: float = Field(
        default=0.0, 
        ge=-360, 
        le=360, 
        description="Rotation angle in degrees (clockwise)"
    )
    opacity: float = Field(
        default=1.0, 
        ge=0.0, 
        le=1.0, 
        description="Opacity (0=transparent, 1=opaque)"
    )
    
    @field_validator('color')
    @classmethod
    def validate_color(cls, v: str) -> str:
        """Ensure color is uppercase for consistency"""
        return v.upper()
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "font_family": "Helvetica",
                "font_size": 14.0,
                "bold": True,
                "color": "#000000",
                "alignment": "left"
            }
        }
    )


class ImageBorder(BaseModel):
    """
    Border properties for image elements.
    Stored in JSON alongside image properties — backward-compatible with existing records
    (missing 'border' key in old JSON will simply use these defaults).
    """
    enabled: bool = Field(default=False, description="Whether to draw a border around the image")
    color: str = Field(
        default="#000000",
        pattern=r'^#[0-9A-Fa-f]{6}$',
        description="Border color as hex code (e.g., #FF0000)"
    )
    thickness: float = Field(
        default=1.0,
        gt=0,
        le=50,
        description="Border line thickness in PDF points"
    )
    corner_radius: float = Field(
        default=0.0,
        ge=0,
        le=200,
        description="Rounded corner radius in PDF points (0 = sharp corners)"
    )

    @field_validator('color')
    @classmethod
    def validate_border_color(cls, v: str) -> str:
        """Ensure color is uppercase for consistency"""
        return v.upper()

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "enabled": True,
                "color": "#333333",
                "thickness": 2.0,
                "corner_radius": 8.0
            }
        }
    )


class ImageProperties(BaseModel):
    """Properties for image elements (fixed and placeholder)"""
    width: float = Field(..., gt=0, description="Image width in PDF points")
    height: float = Field(..., gt=0, description="Image height in PDF points")
    maintain_aspect_ratio: bool = Field(
        default=True, 
        description="Maintain original aspect ratio when resizing"
    )
    opacity: float = Field(default=1.0, ge=0.0, le=1.0)
    rotation: float = Field(
        default=0.0, 
        ge=-360, 
        le=360, 
        description="Rotation angle in degrees"
    )
    border: ImageBorder = Field(
        default_factory=ImageBorder,
        description="Border styling — defaults to no border (backward-compatible)"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "width": 150.0,
                "height": 100.0,
                "maintain_aspect_ratio": True,
                "border": {
                    "enabled": True,
                    "color": "#000000",
                    "thickness": 1.5,
                    "corner_radius": 5.0
                }
            }
        }
    )


# Element type validators
class StaticTextElement(BaseModel):
    """
    Static text element with fixed content.
    Use for labels, headers, or any text that doesn't change.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal[ElementType.STATIC_TEXT] = ElementType.STATIC_TEXT
    position: Position
    content: str = Field(
        ..., 
        min_length=1, 
        max_length=10000, 
        description="Static text content"
    )
    formatting: TextFormatting = Field(default_factory=TextFormatting)
    width: Optional[float] = Field(default=None, gt=0, description="Optional fixed width for text box")
    height: Optional[float] = Field(default=None, gt=0, description="Optional fixed height for text box")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "type": "static_text",
                "position": {"x": 100.0, "y": 200.0},
                "content": "Invoice Number:",
                "formatting": {
                    "font_family": "Helvetica",
                    "font_size": 14.0,
                    "bold": True,
                    "color": "#000000"
                }
            }
        }
    )


class TextVariableElement(BaseModel):
    """
    Text variable element - placeholder for dynamic content.
    Structurally identical to StaticTextElement, but visually distinguished
    in the UI to represent dynamic data (e.g., {{ customer_name }}).
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal[ElementType.TEXT_VARIABLE] = ElementType.TEXT_VARIABLE
    position: Position
    content: str = Field(
        ..., 
        min_length=1, 
        max_length=10000, 
        description="The variable identifier (e.g., customer_name)"
    )
    formatting: TextFormatting = Field(default_factory=TextFormatting)
    width: Optional[float] = Field(default=None, gt=0, description="Optional fixed width for text box")
    height: Optional[float] = Field(default=None, gt=0, description="Optional fixed height for text box")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "223e4567-e89b-12d3-a456-426614174001",
                "type": "text_variable",
                "position": {"x": 200.0, "y": 200.0},
                "content": "invoice_number",
                "formatting": {
                    "font_family": "Courier",
                    "font_size": 12.0,
                    "color": "#333333"
                }
            }
        }
    )


class FixedImageElement(BaseModel):
    """
    Fixed image element - image URL is known at template design time.
    Use for logos, watermarks, or any static images.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal[ElementType.FIXED_IMAGE] = ElementType.FIXED_IMAGE
    position: Position
    asset_id: Optional[str] = Field(
        default=None,
        description="Asset ID from storage provider (e.g., Dropbox) for regenerating URLs"
    )
    image_url: str = Field(
        ..., 
        min_length=1,
        description="URL to the fixed image (cloud storage URL)"
    )
    properties: ImageProperties
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "323e4567-e89b-12d3-a456-426614174002",
                "type": "fixed_image",
                "position": {"x": 50.0, "y": 700.0},
                "image_url": "https://storage.example.com/logos/company-logo.png",
                "properties": {
                    "width": 150.0,
                    "height": 50.0,
                    "maintain_aspect_ratio": True
                }
            }
        }
    )


class ImagePlaceholderElement(BaseModel):
    """
    Image placeholder element - image will be provided when generating PDF.
    Structurally identical to FixedImageElement, but represents a placeholder.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal[ElementType.IMAGE_PLACEHOLDER] = ElementType.IMAGE_PLACEHOLDER
    position: Position
    asset_id: Optional[str] = Field(
        default=None,
        description="Asset ID from storage provider (will be populated later)"
    )
    image_url: str = Field(
        ..., 
        min_length=1,
        description="The placeholder identifier acting as dummy URL (e.g., customer_signature)"
    )
    properties: ImageProperties
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "423e4567-e89b-12d3-a456-426614174003",
                "type": "image_placeholder",
                "position": {"x": 400.0, "y": 600.0},
                "image_url": "customer_signature",
                "properties": {
                    "width": 200.0,
                    "height": 100.0,
                    "maintain_aspect_ratio": False
                }
            }
        }
    )


# Union type for any element (discriminated union based on 'type' field)
Element = Union[
    StaticTextElement, 
    TextVariableElement, 
    FixedImageElement, 
    ImagePlaceholderElement
]
