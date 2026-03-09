from typing import Dict, Any, Optional
from io import BytesIO
import httpx
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PyPDF2 import PdfReader, PdfWriter, Transformation
from PIL import Image
import logging

from ..schemas.elements import (
    StaticTextElement,
    TextVariableElement,
    FixedImageElement,
    ImagePlaceholderElement,
    FontFamily
)

logger = logging.getLogger(__name__)


class ReportLabPDFGenerator:
    """
    PDF generator using ReportLab + PyPDF2.
    
    This engine creates an overlay canvas with all elements,
    then merges it with the base PDF.
    
    Note: ReportLab does NOT support transparent PNG images well.
    Transparent areas will appear as black backgrounds.
    Use PyMuPDF engine for proper transparency support.
    """
    
    # Font mapping from schema to ReportLab font names
    FONT_MAPPING = {
        FontFamily.HELVETICA: "Helvetica",
        FontFamily.HELVETICA_BOLD: "Helvetica-Bold",
        FontFamily.HELVETICA_OBLIQUE: "Helvetica-Oblique",
        FontFamily.HELVETICA_BOLD_OBLIQUE: "Helvetica-BoldOblique",
        FontFamily.TIMES_ROMAN: "Times-Roman",
        FontFamily.TIMES_BOLD: "Times-Bold",
        FontFamily.TIMES_ITALIC: "Times-Italic",
        FontFamily.TIMES_BOLD_ITALIC: "Times-BoldItalic",
        FontFamily.COURIER: "Courier",
        FontFamily.COURIER_BOLD: "Courier-Bold",
        FontFamily.COURIER_OBLIQUE: "Courier-Oblique",
        FontFamily.COURIER_BOLD_OBLIQUE: "Courier-BoldOblique",
    }
    
    @staticmethod
    async def download_file(url: str) -> bytes:
        """Download a file from URL."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, follow_redirects=True)
            response.raise_for_status()
            return response.content
    
    @staticmethod
    def _apply_text_formatting(
        c: canvas.Canvas,
        element: StaticTextElement | TextVariableElement,
        text: str
    ):
        """Apply text formatting and draw text on canvas."""
        formatting = element.formatting
        position = element.position
        
        # Set font
        font_name = ReportLabPDFGenerator.FONT_MAPPING.get(
            formatting.font_family, 
            "Helvetica"
        )
        c.setFont(font_name, formatting.font_size)
        
        # Set color
        color = HexColor(formatting.color)
        c.setFillColor(color)
        
        # Set opacity (alpha)
        c.setFillAlpha(formatting.opacity)
        
        # Save state for transformations
        c.saveState()
        
        # Apply rotation if needed
        if formatting.rotation != 0:
            c.translate(position.x, position.y)
            c.rotate(formatting.rotation)
            draw_x, draw_y = 0, 0
        else:
            draw_x, draw_y = position.x, position.y
        
        # Handle text alignment
        if formatting.alignment == "left":
            c.drawString(draw_x, draw_y, text)
        elif formatting.alignment == "center":
            c.drawCentredString(draw_x, draw_y, text)
        elif formatting.alignment == "right":
            c.drawRightString(draw_x, draw_y, text)
        else:  # justify - treat as left for single line
            c.drawString(draw_x, draw_y, text)
        
        # Underline if needed
        if formatting.underline:
            text_width = c.stringWidth(text, font_name, formatting.font_size)
            c.line(draw_x, draw_y - 1, draw_x + text_width, draw_y - 1)
        
        c.restoreState()
    
    @staticmethod
    async def _draw_image(
        c: canvas.Canvas,
        element: FixedImageElement | ImagePlaceholderElement,
        image_data: bytes
    ):
        """Draw image on canvas with proper sizing and transformations."""
        properties = element.properties
        position = element.position
        
        # Load image to get dimensions
        img = Image.open(BytesIO(image_data))
        original_width, original_height = img.size
        
        # Calculate display dimensions
        if properties.maintain_aspect_ratio:
            aspect_ratio = original_width / original_height
            target_aspect = properties.width / properties.height
            
            if aspect_ratio > target_aspect:
                display_width = properties.width
                display_height = properties.width / aspect_ratio
            else:
                display_height = properties.height
                display_width = properties.height * aspect_ratio
        else:
            display_width = properties.width
            display_height = properties.height
        
        # Save state for transformations
        c.saveState()
        
        # Set opacity
        c.setFillAlpha(properties.opacity)
        
        # Apply rotation if needed
        if properties.rotation != 0:
            c.translate(position.x, position.y)
            c.rotate(properties.rotation)
            draw_x, draw_y = 0, 0
        else:
            draw_x, draw_y = position.x, position.y
        
        # Save image to temporary BytesIO and wrap in ImageReader
        img_buffer = BytesIO()
        img.save(img_buffer, format=img.format or 'PNG')
        img_buffer.seek(0)
        
        # Draw image - use ImageReader to wrap BytesIO
        from reportlab.lib.utils import ImageReader
        c.drawImage(
            ImageReader(img_buffer),
            draw_x,
            draw_y,
            width=display_width,
            height=display_height,
            preserveAspectRatio=properties.maintain_aspect_ratio
        )
        
        c.restoreState()
    
    @classmethod
    async def generate_pdf(
        cls,
        template_data: Dict[str, Any],
        variables: Dict[str, str],
        placeholder_images: Dict[str, str]
    ) -> bytes:
        """
        Generate a PDF from template data with dynamic content.
        
        Uses ReportLab to create an overlay canvas, then merges
        with the base PDF using PyPDF2.
        
        Args:
            template_data: Template metadata with elements
            variables: Variable name -> value mapping
            placeholder_images: Placeholder name -> image URL mapping
            
        Returns:
            Generated PDF as bytes
        """
        variables = variables or {}
        placeholder_images = placeholder_images or {}
        
        try:
            # 1. Download base PDF
            logger.info(f"[ReportLab] Downloading base PDF from {template_data['base_pdf_url']}")
            base_pdf_bytes = await cls.download_file(template_data['base_pdf_url'])
            
            # 2. Create overlay with elements
            logger.info("[ReportLab] Creating PDF overlay with template elements")
            overlay_buffer = BytesIO()
            
            page_size = (template_data['base_pdf_width'], template_data['base_pdf_height'])
            c = canvas.Canvas(overlay_buffer, pagesize=page_size)
            
            # Process each element
            elements = template_data['metadata']['elements']
            
            for element_data in elements:
                element_type = element_data['type']
                
                if element_type == 'static_text':
                    element = StaticTextElement(**element_data)
                    cls._apply_text_formatting(c, element, element.content)
                    logger.debug(f"[ReportLab] Rendered static text: {element.content}")
                
                elif element_type == 'text_variable':
                    element = TextVariableElement(**element_data)
                    text_value = variables.get(
                        element.variable_name, 
                        element.default_value or ""
                    )
                    
                    if element.max_length and len(text_value) > element.max_length:
                        text_value = text_value[:element.max_length]
                    
                    cls._apply_text_formatting(c, element, text_value)
                    logger.debug(f"[ReportLab] Rendered variable {element.variable_name}: {text_value}")
                
                elif element_type == 'fixed_image':
                    element = FixedImageElement(**element_data)
                    image_bytes = await cls.download_file(element.image_url)
                    await cls._draw_image(c, element, image_bytes)
                    logger.debug(f"[ReportLab] Rendered fixed image: {element.image_url}")
                
                elif element_type == 'image_placeholder':
                    element = ImagePlaceholderElement(**element_data)
                    image_url = placeholder_images.get(element.placeholder_name)
                    
                    if image_url:
                        image_bytes = await cls.download_file(image_url)
                        await cls._draw_image(c, element, image_bytes)
                        logger.debug(f"[ReportLab] Rendered placeholder {element.placeholder_name}")
                    else:
                        logger.warning(
                            f"[ReportLab] No image provided for placeholder: {element.placeholder_name}"
                        )
            
            # Finalize overlay
            c.save()
            overlay_buffer.seek(0)
            
            # 3. Merge base PDF with overlay
            logger.info("[ReportLab] Merging base PDF with overlay")
            base_pdf = PdfReader(BytesIO(base_pdf_bytes))
            overlay_pdf = PdfReader(overlay_buffer)
            writer = PdfWriter()
            
            base_page = base_pdf.pages[0]
            overlay_page = overlay_pdf.pages[0]
            
            base_page.merge_page(overlay_page)
            writer.add_page(base_page)
            
            for page_num in range(1, len(base_pdf.pages)):
                writer.add_page(base_pdf.pages[page_num])
            
            # 4. Return generated PDF bytes
            output_buffer = BytesIO()
            writer.write(output_buffer)
            output_buffer.seek(0)
            
            logger.info("[ReportLab] PDF generation completed successfully")
            return output_buffer.getvalue()
        
        except httpx.HTTPError as e:
            logger.error(f"[ReportLab] Failed to download file: {e}")
            raise ValueError(f"Failed to download file from URL: {e}")
        except Exception as e:
            logger.error(f"[ReportLab] PDF generation failed: {e}", exc_info=True)
            raise
