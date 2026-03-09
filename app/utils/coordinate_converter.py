from typing import Tuple
from pydantic import BaseModel, Field


class CoordinateConverter:
    """
    Coordinate conversion utilities for PDF template system.
    
    PDF Standard: 
        - Origin at bottom-left corner
        - Units in points (1 pt = 1/72 inch)
        - Y-axis increases upward
    
    Frontend/Canvas:
        - Origin at top-left corner (typical for HTML canvas, browser coordinates)
        - Units in pixels
        - Y-axis increases downward
    """
    
    @staticmethod
    def frontend_to_pdf(
        x_pixels: float,
        y_pixels: float,
        canvas_width: float,
        canvas_height: float,
        pdf_width: float,
        pdf_height: float
    ) -> Tuple[float, float]:
        """
        Convert frontend coordinates (top-left origin, pixels) to PDF coordinates (bottom-left origin, points).
        
        Args:
            x_pixels: X coordinate in frontend pixels
            y_pixels: Y coordinate in frontend pixels (from top)
            canvas_width: Frontend canvas width in pixels
            canvas_height: Frontend canvas height in pixels
            pdf_width: PDF width in points
            pdf_height: PDF height in points
        
        Returns:
            Tuple of (x_pdf, y_pdf) in PDF points
        
        Example:
            >>> CoordinateConverter.frontend_to_pdf(
            ...     x_pixels=400, y_pixels=200,
            ...     canvas_width=800, canvas_height=1037,
            ...     pdf_width=612, pdf_height=792
            ... )
            (306.0, 639.2)
        """
        # Calculate scale factors
        scale_x = pdf_width / canvas_width
        scale_y = pdf_height / canvas_height
        
        # Convert pixels to points
        x_pdf = x_pixels * scale_x
        y_from_top_pdf = y_pixels * scale_y
        
        # Convert from top-left origin to bottom-left origin
        y_pdf = pdf_height - y_from_top_pdf
        
        return (x_pdf, y_pdf)
    
    @staticmethod
    def pdf_to_frontend(
        x_pdf: float,
        y_pdf: float,
        pdf_width: float,
        pdf_height: float,
        canvas_width: float,
        canvas_height: float
    ) -> Tuple[float, float]:
        """
        Convert PDF coordinates (bottom-left origin, points) to frontend coordinates (top-left origin, pixels).
        
        Args:
            x_pdf: X coordinate in PDF points
            y_pdf: Y coordinate in PDF points (from bottom)
            pdf_width: PDF width in points
            pdf_height: PDF height in points
            canvas_width: Frontend canvas width in pixels
            canvas_height: Frontend canvas height in pixels
        
        Returns:
            Tuple of (x_pixels, y_pixels) in frontend pixels
        
        Example:
            >>> CoordinateConverter.pdf_to_frontend(
            ...     x_pdf=306, y_pdf=639.2,
            ...     pdf_width=612, pdf_height=792,
            ...     canvas_width=800, canvas_height=1037
            ... )
            (400.0, 200.0)
        """
        # Calculate scale factors
        scale_x = canvas_width / pdf_width
        scale_y = canvas_height / pdf_height
        
        # Convert from bottom-left origin to top-left origin
        y_from_top_pdf = pdf_height - y_pdf
        
        # Convert points to pixels
        x_pixels = x_pdf * scale_x
        y_pixels = y_from_top_pdf * scale_y
        
        return (x_pixels, y_pixels)
    
    @staticmethod
    def percentage_to_pdf(
        x_percent: float,
        y_percent: float,
        pdf_width: float,
        pdf_height: float,
        origin: str = "top-left"
    ) -> Tuple[float, float]:
        """
        Convert percentage coordinates to PDF points.
        
        Args:
            x_percent: X coordinate as percentage (0-100)
            y_percent: Y coordinate as percentage (0-100)
            pdf_width: PDF width in points
            pdf_height: PDF height in points
            origin: Coordinate origin ("top-left" or "bottom-left")
        
        Returns:
            Tuple of (x_pdf, y_pdf) in PDF points
        
        Example:
            >>> CoordinateConverter.percentage_to_pdf(
            ...     x_percent=50, y_percent=25,
            ...     pdf_width=612, pdf_height=792,
            ...     origin="top-left"
            ... )
            (306.0, 594.0)
        """
        x_pdf = (x_percent / 100.0) * pdf_width
        y_pdf = (y_percent / 100.0) * pdf_height
        
        if origin == "top-left":
            # Convert from top-left to bottom-left
            y_pdf = pdf_height - y_pdf
        
        return (x_pdf, y_pdf)
    
    @staticmethod
    def pdf_to_percentage(
        x_pdf: float,
        y_pdf: float,
        pdf_width: float,
        pdf_height: float,
        origin: str = "top-left"
    ) -> Tuple[float, float]:
        """
        Convert PDF points to percentage coordinates.
        
        Args:
            x_pdf: X coordinate in PDF points
            y_pdf: Y coordinate in PDF points
            pdf_width: PDF width in points
            pdf_height: PDF height in points
            origin: Coordinate origin for output ("top-left" or "bottom-left")
        
        Returns:
            Tuple of (x_percent, y_percent) as percentages (0-100)
        
        Example:
            >>> CoordinateConverter.pdf_to_percentage(
            ...     x_pdf=306, y_pdf=594,
            ...     pdf_width=612, pdf_height=792,
            ...     origin="top-left"
            ... )
            (50.0, 25.0)
        """
        y_for_calc = y_pdf
        
        if origin == "top-left":
            # Convert from bottom-left to top-left
            y_for_calc = pdf_height - y_pdf
        
        x_percent = (x_pdf / pdf_width) * 100.0
        y_percent = (y_for_calc / pdf_height) * 100.0
        
        return (x_percent, y_percent)
    
    @staticmethod
    def points_to_inches(points: float) -> float:
        """Convert PDF points to inches"""
        return points / 72.0
    
    @staticmethod
    def inches_to_points(inches: float) -> float:
        """Convert inches to PDF points"""
        return inches * 72.0
    
    @staticmethod
    def points_to_mm(points: float) -> float:
        """Convert PDF points to millimeters"""
        return points * 0.352778
    
    @staticmethod
    def mm_to_points(mm: float) -> float:
        """Convert millimeters to PDF points"""
        return mm / 0.352778


class FrontendCoordinateRequest(BaseModel):
    """Request model for coordinate conversion from frontend"""
    x_pixels: float = Field(..., description="X coordinate in pixels")
    y_pixels: float = Field(..., description="Y coordinate in pixels")
    canvas_width: float = Field(..., gt=0, description="Canvas width in pixels")
    canvas_height: float = Field(..., gt=0, description="Canvas height in pixels")
    pdf_width: float = Field(..., gt=0, description="PDF width in points")
    pdf_height: float = Field(..., gt=0, description="PDF height in points")


class PDFCoordinateResponse(BaseModel):
    """Response model for PDF coordinates"""
    x_pdf: float = Field(..., description="X coordinate in PDF points")
    y_pdf: float = Field(..., description="Y coordinate in PDF points")
