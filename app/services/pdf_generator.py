from typing import Dict, Any, Optional
from io import BytesIO
import httpx
import fitz  # PyMuPDF
from PIL import Image, ImageDraw, ImageChops
import logging
import base64
from ..schemas.elements import (
    StaticTextElement,
    TextVariableElement,
    FixedImageElement,
    ImagePlaceholderElement,
    FontFamily,
    ImageBorder
)

logger = logging.getLogger(__name__)


class PyMuPDFGenerator:
    """
    Service for generating PDFs from templates with variable data using PyMuPDF.
    
    This service:
    1. Downloads the base PDF from cloud storage
    2. Adds template elements (text, images) directly to the PDF
    3. Returns the generated PDF as bytes
    
    PyMuPDF provides native support for transparent PNG images!
    """
    
    # Font mapping from schema to PyMuPDF font names
    FONT_MAPPING = {
        FontFamily.HELVETICA: "helv",
        FontFamily.HELVETICA_BOLD: "hebo",
        FontFamily.HELVETICA_OBLIQUE: "heit",
        FontFamily.HELVETICA_BOLD_OBLIQUE: "hebi",
        FontFamily.TIMES_ROMAN: "times",
        FontFamily.TIMES_BOLD: "tibo",
        FontFamily.TIMES_ITALIC: "tiit",
        FontFamily.TIMES_BOLD_ITALIC: "tibi",
        FontFamily.COURIER: "cour",
        FontFamily.COURIER_BOLD: "cobo",
        FontFamily.COURIER_OBLIQUE: "coit",
        FontFamily.COURIER_BOLD_OBLIQUE: "cobi",
    }
    
    @staticmethod
    def hex_to_rgb(hex_color: str) -> tuple:
        """
        Convert hex color to RGB tuple for PyMuPDF.
        
        Args:
            hex_color: "#RRGGBB" format
            
        Returns:
            (r, g, b) tuple with values 0.0-1.0
        """
        hex_color = hex_color.lstrip('#')
        r = int(hex_color[0:2], 16) / 255.0
        g = int(hex_color[2:4], 16) / 255.0
        b = int(hex_color[4:6], 16) / 255.0
        return (r, g, b)
    
    @staticmethod
    async def _download_base_pdf(url: str) -> bytes:
        """
        Download base PDF from cloud storage URL.
        
        Args:
            url: Cloud storage URL for base PDF
            
        Returns:
            PDF bytes
            
        Raises:
            httpx.HTTPError: If download fails
        """
        logger.info(f"Downloading base PDF from: {url}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, follow_redirects=True)
            response.raise_for_status()
            
        logger.info(f"Downloaded PDF: {len(response.content)} bytes")
        return response.content
    
    @staticmethod
    async def _download_image(url: str) -> Image.Image:
        """
        Download image from URL ONLY.
        
        Args:
            url: Image URL
            
        Returns:
            PIL Image object
        """
        logger.info(f"Downloading image from: {url}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, follow_redirects=True)
            response.raise_for_status()
            
        img = Image.open(BytesIO(response.content))
        logger.info(f"Downloaded image: {img.size}, mode: {img.mode}")
        return img
    
    @classmethod
    def _draw_static_text(cls, page: fitz.Page, element: StaticTextElement):
        """
        Draw static text element on PDF page.
        
        Args:
            page: PyMuPDF page object
            element: Static text element
        """
        font_name = cls.FONT_MAPPING.get(element.formatting.font_family, "helv")
        color = cls.hex_to_rgb(element.formatting.color)
        
        text_to_draw = element.content
        
        # Wrap the text explicitly via \n injection if width is provided
        if element.width and element.width > 0:
            text_to_draw = cls._wrap_text_manually(
                text=text_to_draw,
                max_width=element.width,
                font_name=font_name,
                font_size=element.formatting.font_size,
                letter_spacing=element.formatting.letter_spacing,
                max_height=element.height,
                line_height_multiplier=element.formatting.line_height,
                element_name="Static Text"
            )
        
        # Frontend and PyMuPDF both use Top-Left origin (Y=0 is TOP)
        # However, PyMuPDF's insert_text uses the point as the bottom-left BASELINE of the text!
        # If the frontend specifies (x,y) as the top-left of the text bounding box,
        # we must add the font size to 'y' to push the baseline down, otherwise text draws upwards and gets cut off.
        # Adding font_size * 0.9 roughly approximates the baseline position in a standard web line-height box.
        adjusted_y = element.position.y + (element.formatting.font_size * 0.9)
        point = fitz.Point(element.position.x, adjusted_y)
        
        # Insert text
        page.insert_text(
            point=point,
            text=text_to_draw,
            fontname=font_name,
            fontsize=element.formatting.font_size,
            color=color,
            rotate=int(element.formatting.rotation),
            fill_opacity=element.formatting.opacity,
            stroke_opacity=element.formatting.opacity
        )
        
        logger.debug(f"Drew static text: '{element.content}' at ({element.position.x}, {adjusted_y})")
    
    @classmethod
    def _wrap_text_manually(
        cls, 
        text: str, 
        max_width: float, 
        font_name: str, 
        font_size: float, 
        letter_spacing: float = 0.0,
        max_height: Optional[float] = None,
        line_height_multiplier: float = 1.2,
        element_name: str = "Text Variable"
    ) -> str:
        """
        Manually wraps text by inserting \n when the measured text width
        exceeds the max_width of the container.
        """
        if not text or not max_width or max_width <= 0:
            return text
            
        try:
            # Load the PyMuPDF font object to measure perfectly
            font = fitz.Font(fontname=font_name)
        except Exception as e:
            logger.warning(f"Could not load font {font_name} for wrapping. Skipping. {e}")
            return text

        paragraphs = str(text).split('\n')
        final_lines = []

        for paragraph in paragraphs:
            words = paragraph.split(' ')
            if not words:
                final_lines.append("")
                continue

            current_line = words[0]

            for word in words[1:]:
                test_line = current_line + " " + word
                test_width = font.text_length(test_line, fontsize=font_size)
                
                if letter_spacing > 0:
                    test_width += (len(test_line) - 1) * letter_spacing
                
                if test_width > max_width:
                    final_lines.append(current_line)
                    current_line = word 
                else:
                    current_line = test_line
            
            if current_line:
                final_lines.append(current_line)

        # Check height overflow
        if max_height and max_height > 0:
            total_lines = len(final_lines)
            line_pixel_height = font_size * line_height_multiplier
            total_calculated_height = total_lines * line_pixel_height
            
            if total_calculated_height > max_height:
                raise ValueError(f"Text for '{element_name}' is too long and exceeds the vertical bounds of its template container.")

        return "\n".join(final_lines)

    @classmethod
    def _draw_text_variable(
        cls,
        page: fitz.Page,
        element: TextVariableElement,
        variables: Dict[str, str]
    ):
        """
        Draw text variable element on PDF page.
        
        Args:
            page: PyMuPDF page object
            element: Text variable element
            variables: Dictionary of variable values
        """
        # Get variable value or fallback to empty string if missing
        value = variables.get(element.content, f"{{{{{element.content}}}}}")
        
        # Max length is constrained by the form input on frontend,
        # but the BaseModel doesn't expose it as an attribute.
        
        font_name = cls.FONT_MAPPING.get(element.formatting.font_family, "helv")
        color = cls.hex_to_rgb(element.formatting.color)
        
        # Wrap the text explicitly via \n injection if width is provided
        if element.width and element.width > 0:
            value = cls._wrap_text_manually(
                text=value,
                max_width=element.width,
                font_name=font_name,
                font_size=element.formatting.font_size,
                letter_spacing=element.formatting.letter_spacing,
                max_height=element.height,
                line_height_multiplier=element.formatting.line_height,
                element_name=element.content
            )
        
        # Frontend and PyMuPDF both use Top-Left origin (Y=0 is TOP)
        # Shift baseline down so text bounding box top-left matches frontend coordinates
        adjusted_y = element.position.y + (element.formatting.font_size * 0.9)
        point = fitz.Point(element.position.x, adjusted_y)
        
        page.insert_text(
            point=point,
            text=value,
            fontname=font_name,
            fontsize=element.formatting.font_size,
            color=color,
            rotate=int(element.formatting.rotation),
            fill_opacity=element.formatting.opacity,
            stroke_opacity=element.formatting.opacity
        )
        
        logger.debug(f"Drew text variable '{element.content}': '{value}' at ({element.position.x}, {adjusted_y})")
    
    @staticmethod
    def _apply_rounded_mask(img: Image.Image, corner_radius_pt: float, pdf_width_pt: float, pdf_height_pt: float) -> Image.Image:
        """
        Apply a rounded-corner alpha mask to an image using Pillow.

        Preserves the original image transparency: takes the pixel-wise minimum
        of the existing alpha channel and the rounded-rectangle mask, so pixels
        that were already transparent (e.g. PNG backgrounds) stay transparent
        and only the corners are additionally clipped.
        """
        img = img.convert("RGBA")
        img_w_px, img_h_px = img.size

        # Scale radius from PDF points → pixels
        scale_x = img_w_px / pdf_width_pt if pdf_width_pt > 0 else 1
        scale_y = img_h_px / pdf_height_pt if pdf_height_pt > 0 else 1
        scale = (scale_x + scale_y) / 2
        radius_px = int(corner_radius_pt * scale)
        radius_px = max(0, min(radius_px, min(img_w_px, img_h_px) // 2))

        # Build rounded-rectangle mask (white = keep, black = clip)
        corner_mask = Image.new("L", img.size, 0)
        draw = ImageDraw.Draw(corner_mask)
        draw.rounded_rectangle([0, 0, img_w_px - 1, img_h_px - 1], radius=radius_px, fill=255)

        # Preserve original alpha: use minimum of existing alpha and corner mask.
        # putalpha(mask) REPLACES alpha entirely → transparent areas turn black.
        # ImageChops.multiply keeps original transparency intact.
        original_alpha = img.split()[3]          # extract existing alpha channel
        combined_alpha = ImageChops.multiply(original_alpha, corner_mask)
        img.putalpha(combined_alpha)
        return img

    @classmethod
    async def _draw_image(
        cls,
        page: fitz.Page,
        element: FixedImageElement | ImagePlaceholderElement,
        image_url: str
    ):
        """
        Draw image element on PDF page with transparency support.
        
        Args:
            page: PyMuPDF page object
            element: Image element (fixed or placeholder)
            image_url: URL to download image from
        """
        # Download image
        img = await cls._download_image(image_url)
        
        # Get dimensions
        properties = element.properties
        width = properties.width
        height = properties.height
        
        # Handle aspect ratio
        if properties.maintain_aspect_ratio and img.size[0] > 0 and img.size[1] > 0:
            aspect_ratio = img.size[0] / img.size[1]
            
            # Adjust dimensions to maintain aspect ratio
            if width / height > aspect_ratio:
                width = height * aspect_ratio
            else:
                height = width / aspect_ratio
        
        # Apply rounded-corner mask BEFORE encoding if border has corner radius
        # This makes image corners transparent so they don't bleed outside the border
        border = properties.border
        if border.enabled and border.corner_radius > 0:
            img = cls._apply_rounded_mask(img, border.corner_radius, width, height)
            logger.debug(f"Applied rounded corner mask: radius={border.corner_radius}pt")

        # Convert image to bytes (PNG preserves transparency)
        img_buffer = BytesIO()
        img.save(img_buffer, format='PNG')
        img_bytes = img_buffer.getvalue()
        
        # Frontend and PyMuPDF both use Top-Left origin
        # (x, y) is the top-left corner of the element 
        rect = fitz.Rect(
            element.position.x,
            element.position.y,
            element.position.x + width,
            element.position.y + height
        )
        
        # Insert image with transparency support!
        # PyMuPDF rotate only supports 0, 90, 180, 270
        valid_rotations = [0, 90, 180, 270]
        rotation = int(properties.rotation)
        rotation = min(valid_rotations, key=lambda x: abs(x - rotation))
        
        page.insert_image(
            rect=rect,
            stream=img_bytes,
            keep_proportion=properties.maintain_aspect_ratio,
            rotate=rotation
        )

        # Draw border stroke overlay if enabled
        # border variable was already read above when applying the mask
        if border.enabled:
            border_color = cls.hex_to_rgb(border.color)

            # PyMuPDF draw_rect radius is a RATIO where:
            #   radius=1.0 → arc radius = min(w, h)  (full shortest side)
            # So to get our corner_radius in points: ratio = corner_radius_pt / min(w, h)
            radius_ratio = None
            if border.corner_radius > 0:
                shortest = min(rect.width, rect.height)
                if shortest > 0:
                    radius_ratio = min(border.corner_radius / shortest, 1.0)

            page.draw_rect(
                rect,
                color=border_color,
                fill=None,           # transparent fill — only the stroke
                width=border.thickness,
                radius=radius_ratio
            )
            logger.debug(
                f"Drew border: color={border.color}, thickness={border.thickness}, "
                f"radius={border.corner_radius} on rect({rect})"
            )

        logger.debug(f"Drew image at template({element.position.x}, {element.position.y}) -> PDF rect({rect})")
    
    @classmethod
    async def generate_pdf(
        cls,
        template_data: Dict[str, Any],
        variables: Dict[str, str],
        placeholder_images: Dict[str, dict],
        certificate_width: Optional[float] = None,
        certificate_height: Optional[float] = None,
    ) -> bytes:
        """
        Generate PDF from template data and variables.
        
        Args:
            template_data: Template configuration with elements
            variables: Variable values for text_variable elements
            placeholder_images: Image URLs for image_placeholder elements
            certificate_width: Optional target page width in PDF points. If provided
                together with certificate_height, the finished page (with all elements
                already drawn) is scaled and resized to these dimensions.
            certificate_height: Optional target page height in PDF points.
            
        Returns:
            Generated PDF as bytes
            
        Raises:
            ValueError: If template data is invalid
            Exception: If PDF generation fails
        """
        try:
            logger.info(f"Starting PDF generation")
            
            # Download base PDF
            base_pdf_bytes = await cls._download_base_pdf(template_data["base_pdf_url"])
            
            # Open PDF with PyMuPDF
            doc = fitz.open(stream=base_pdf_bytes, filetype="pdf")
            
            # Get first page (we only work with single-page PDFs for now)
            if len(doc) == 0:
                raise ValueError("Base PDF has no pages")
            
            page = doc[0]
            logger.info(f"PDF page size: {page.rect.width} x {page.rect.height}")
            
            # Parse elements from metadata
            elements_data = template_data.get("metadata", {})
            if not isinstance(elements_data, dict):
                raise ValueError("Invalid metadata format")
            
            elements_list = elements_data.get("elements", [])
            
            # Process each element
            for element_dict in elements_list:
                element_type = element_dict.get("type")
                
                if element_type == "static_text":
                    element = StaticTextElement(**element_dict)
                    cls._draw_static_text(page, element)
                    
                elif element_type == "text_variable":
                    element = TextVariableElement(**element_dict)
                    cls._draw_text_variable(page, element, variables)
                    
                elif element_type == "fixed_image":
                    element = FixedImageElement(**element_dict)
                    await cls._draw_image(page, element, element.image_url)
                    
                elif element_type == "image_placeholder":
                    element = ImagePlaceholderElement(**element_dict)
                    image_data = placeholder_images.get(element.image_url)
                    
                    if not image_data or not isinstance(image_data, dict) or not image_data.get("url"):
                        logger.warning(f"No valid image data provided for placeholder: {element.image_url}")
                        continue
                    
                    await cls._draw_image(page, element, image_data["url"])
                else:
                    logger.warning(f"Unknown element type: {element_type}")
            
            # ── Resize page to certificate dimensions (if specified) ──────────
            if certificate_width and certificate_height:
                orig_w = page.rect.width
                orig_h = page.rect.height

                # Only resize if dimensions meaningfully differ from base PDF
                if abs(orig_w - certificate_width) > 0.5 or abs(orig_h - certificate_height) > 0.5:
                    # Create a new document at the target dimensions and render
                    # the fully-drawn page into it — this scales all content.
                    # (page.transform() is not available in older PyMuPDF versions)
                    out_doc = fitz.open()
                    out_page = out_doc.new_page(width=certificate_width, height=certificate_height)
                    out_page.show_pdf_page(out_page.rect, doc, 0, keep_proportion=False)

                    pdf_bytes = out_doc.tobytes()
                    out_doc.close()
                    doc.close()

                    logger.info(
                        f"Resized page {orig_w:.1f}x{orig_h:.1f} → "
                        f"{certificate_width:.1f}x{certificate_height:.1f} pt"
                    )
                    logger.info(f"PDF generation complete: {len(pdf_bytes)} bytes")
                    return pdf_bytes

            # No resize needed — return the page as-is
            pdf_bytes = doc.tobytes()
            doc.close()

            logger.info(f"PDF generation complete: {len(pdf_bytes)} bytes")
            return pdf_bytes
            
        except Exception as e:
            logger.error(f"PDF generation failed: {e}", exc_info=True)
            raise
