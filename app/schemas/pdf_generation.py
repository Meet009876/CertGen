from pydantic import BaseModel, Field
from typing import Dict, Optional


class GeneratePDFRequest(BaseModel):
    """Request schema for PDF generation"""
    template_id: str = Field(..., description="UUID of the template to use")
    variables: Optional[Dict[str, str]] = Field(
        default=None,
        description="Map of variable_name -> value for text variables, must include 'certificate_number'"
    )
    placeholder_images: Optional[Dict] = Field(
        default=None,
        description="Map of placeholder_name -> image_url for generation, or dict with 'existing' list and 'replaced' dict for updates"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "template_id": "550e8400-e29b-41d4-a716-446655440000",
                "variables": {
                    "certificate_number": "CERT-12345",
                    "invoice_number": "INV-12345",
                    "customer_name": "John Doe",
                    "total_amount": "$1,234.56"
                },
                "placeholder_images": {
                    "customer_signature": "https://storage.example.com/signatures/johndoe.png"
                }
            }
        }
