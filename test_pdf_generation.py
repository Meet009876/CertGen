"""
Test script for PDF generation functionality.
This script demonstrates how to use the PDF generation API.

Run this after starting the server with:
    uvicorn app.main:app --reload

Then run:
    python test_pdf_generation.py
"""

import httpx
import asyncio
import json


async def test_pdf_generation():
    """Test PDF generation with a sample template"""
    
    base_url = "http://localhost:8000"
    
    # 1. Create a test template
    print("=" * 60)
    print("Step 1: Creating test template...")
    print("=" * 60)
    
    template_data = {
        "name": "Test Invoice Template",
        "base_pdf_url": "https://drive.google.com/file/d/17IhpCKJOsfO56r2kdnksyHbfHEx3zzij/view?usp=drive_link",
        "base_pdf_width": 612.0,
        "base_pdf_height": 792.0,
        "metadata": {
            "elements": [
                {
                    "type": "static_text",
                    "position": {"x": 50, "y": 750},
                    "content": "INVOICE",
                    "formatting": {
                        "font_family": "Helvetica-Bold",
                        "font_size": 28,
                        "bold": True,
                        "color": "#000000"
                    }
                },
                {
                    "type": "static_text",
                    "position": {"x": 50, "y": 700},
                    "content": "Invoice Number:",
                    "formatting": {
                        "font_size": 12,
                        "color": "#333333"
                    }
                },
                {
                    "type": "text_variable",
                    "position": {"x": 180, "y": 700},
                    "variable_name": "invoice_number",
                    "default_value": "INV-0000",
                    "formatting": {
                        "font_family": "Courier",
                        "font_size": 12
                    }
                },
                {
                    "type": "static_text",
                    "position": {"x": 50, "y": 670},
                    "content": "Customer:",
                    "formatting": {
                        "font_size": 12,
                        "color": "#333333"
                    }
                },
                {
                    "type": "text_variable",
                    "position": {"x": 180, "y": 670},
                    "variable_name": "customer_name",
                    "default_value": "John Doe",
                    "formatting": {
                        "font_size": 12
                    }
                }
            ]
        }
    }
    
    async with httpx.AsyncClient() as client:
        # Create template
        response = await client.post(
            f"{base_url}/api/templates/",
            json=template_data,
            timeout=30.0
        )
        
        if response.status_code == 201:
            template = response.json()
            template_id = template['id']
            print(f"✅ Template created successfully!")
            print(f"   Template ID: {template_id}")
            print(f"   Template Name: {template['name']}")
        elif response.status_code == 400 and "already exists" in response.text:
            # Template already exists, get it by name
            print("Template already exists, fetching by name...")
            response = await client.get(
                f"{base_url}/api/templates/by-name/Test%20Invoice%20Template"
            )
            template = response.json()
            template_id = template['id']
            print(f"✅ Using existing template")
            print(f"   Template ID: {template_id}")
        else:
            print(f"❌ Failed to create template: {response.status_code}")
            print(response.text)
            return
        
        # 2. Generate PDF with dynamic data
        print("\n" + "=" * 60)
        print("Step 2: Generating PDF with dynamic data...")
        print("=" * 60)
        
        generation_request = {
            "template_id": template_id,
            "variables": {
                "invoice_number": "INV-2024-001",
                "customer_name": "Alice Johnson"
            }
        }
        
        print(f"Generating PDF with variables:")
        print(json.dumps(generation_request['variables'], indent=2))
        
        response = await client.post(
            f"{base_url}/api/pdf/generate",
            json=generation_request,
            timeout=60.0
        )
        
        if response.status_code == 200:
            # Save generated PDF
            output_filename = "generated_invoice.pdf"
            with open(output_filename, "wb") as f:
                f.write(response.content)
            
            print(f"✅ PDF generated successfully!")
            print(f"   Saved to: {output_filename}")
            print(f"   File size: {len(response.content)} bytes")
        else:
            print(f"❌ PDF generation failed: {response.status_code}")
            print(response.text)
            return
        
        print("\n" + "=" * 60)
        print("✅ All tests completed successfully!")
        print("=" * 60)


if __name__ == "__main__":
    print("\n🧪 PDF Generation Test Script")
    print("Make sure the server is running: uvicorn app.main:app --reload\n")
    
    try:
        asyncio.run(test_pdf_generation())
    except httpx.ConnectError:
        print("\n❌ Error: Could not connect to server")
        print("   Make sure the server is running on http://localhost:8000")
    except Exception as e:
        print(f"\n❌ Error: {e}")
