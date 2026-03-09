"""
PDF Engine Factory

Provides the correct PDF generator based on the PDF_ENGINE config setting.

Usage:
    from app.services.pdf_engine import get_pdf_generator
    
    PDFGenerator = get_pdf_generator()
    pdf_bytes = await PDFGenerator.generate_pdf(template_data, variables, placeholder_images)

Config (.env):
    PDF_ENGINE=pymupdf      # Default - better transparency support
    PDF_ENGINE=reportlab    # Legacy - for testing/comparison
"""

import logging
from ..config import settings

logger = logging.getLogger(__name__)


def get_pdf_generator():
    """
    Factory function that returns the appropriate PDF generator class
    based on the PDF_ENGINE configuration setting.
    
    Returns:
        PyMuPDFGenerator or ReportLabPDFGenerator class
    """
    engine = settings.PDF_ENGINE.lower().strip()
    
    if engine == "reportlab":
        from .pdf_generator_reportlab import ReportLabPDFGenerator
        logger.info("[PDF Engine] Using ReportLab engine (⚠️ limited transparency support)")
        return ReportLabPDFGenerator
    
    elif engine == "pymupdf":
        from .pdf_generator import PyMuPDFGenerator
        logger.info("[PDF Engine] Using PyMuPDF engine (✅ full transparency support)")
        return PyMuPDFGenerator
    
    else:
        logger.warning(f"[PDF Engine] Unknown engine '{engine}', falling back to PyMuPDF")
        from .pdf_generator import PyMuPDFGenerator
        return PyMuPDFGenerator
