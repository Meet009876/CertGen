# PDF Generation Feature

## Overview

The PDF generation service creates PDFs from templates by:
1. Downloading the base PDF from cloud storage
2. Creating an overlay with all template elements
3. Merging the overlay onto the base PDF
4. Returning the generated PDF

## New Files Added

### 1. `app/services/pdf_generator.py`
Core PDF generation logic using ReportLab and PyPDF2.

**Key Features:**
- Downloads PDFs and images from URLs (supports http/https)
- Renders text with full formatting support (font, size, color, rotation, opacity, etc.)
- Renders images with aspect ratio control, rotation, and opacity
- Merges overlays onto base PDFs

### 2. `app/routes/pdf_generation.py`
API endpoint for PDF generation.

**Endpoint:** `POST /api/pdf/generate`

### 3. `app/schemas/pdf_generation.py`
Request schema for PDF generation.

## API Usage

### Endpoint

```http
POST /api/pdf/generate
Content-Type: application/json

{
  "template_id": "550e8400-e29b-41d4-a716-446655440000",
  "variables": {
    "invoice_number": "INV-12345",
    "customer_name": "John Doe"
  },
  "placeholder_images": {
    "customer_signature": "https://storage.example.com/signatures/sig.png"
  }
}
```

**Response:** PDF file (`application/pdf`)

### Example with cURL

```bash
curl -X POST "http://localhost:8000/api/pdf/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "your-template-id",
    "variables": {
      "invoice_number": "INV-001",
      "customer_name": "Alice"
    }
  }' \
  --output generated.pdf
```

### Example with Python

```python
import httpx
import asyncio

async def generate_pdf():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/api/pdf/generate",
            json={
                "template_id": "your-template-id",
                "variables": {
                    "invoice_number": "INV-001",
                    "customer_name": "Alice"
                }
            },
            timeout=60.0
        )
        
        if response.status_code == 200:
            with open("output.pdf", "wb") as f:
                f.write(response.content)
            print("PDF generated successfully!")

asyncio.run(generate_pdf())
```

## Testing

Run the test script:

```bash
# Start the server
uvicorn app.main:app --reload

# In another terminal, run the test
python test_pdf_generation.py
```

The test script will:
1. Create a test template (or use existing one)
2. Generate a PDF with sample data
3. Save the result as `generated_invoice.pdf`

## Supported Features

### Text Elements

Both `StaticTextElement` and `TextVariableElement` support:

- ✅ Font family (Helvetica, Times, Courier + variants)
- ✅ Font size
- ✅ Bold, italic (via font variants)
- ✅ Underline
- ✅ Color (hex codes)
- ✅ Text alignment (left, center, right)
- ✅ Rotation
- ✅ Opacity
- ✅ Letter spacing (tracked in schema but needs custom implementation)
- ✅ Line height (for multi-line text if implemented)

### Image Elements

Both `FixedImageElement` and `ImagePlaceholderElement` support:

- ✅ Width and height
- ✅ Aspect ratio maintenance
- ✅ Rotation
- ✅ Opacity
- ✅ Download from URLs
- ✅ Common image formats (PNG, JPEG, etc.)

## How It Works

### 1. Text Rendering

The service uses **ReportLab** to render text:

```python
# Apply font and formatting
c.setFont("Helvetica-Bold", 24)
c.setFillColor(HexColor("#FF0000"))
c.setFillAlpha(0.8)

# Handle rotation
if rotation:
    c.translate(x, y)
    c.rotate(rotation)

# Draw text based on alignment
if alignment == "center":
    c.drawCentredString(x, y, text)
elif alignment == "right":
    c.drawRightString(x, y, text)
else:
    c.drawString(x, y, text)
```

### 2. Image Rendering

Images are downloaded, optionally resized, and drawn:

```python
# Download image
image_bytes = await download_file(image_url)
img = Image.open(BytesIO(image_bytes))

# Calculate dimensions with aspect ratio
if maintain_aspect_ratio:
    aspect_ratio = original_width / original_height
    # ... calculate display size

# Draw on canvas
c.drawImage(img_buffer, x, y, width, height)
```

### 3. PDF Merging

The overlay is merged onto the base PDF:

```python
# Read base PDF and overlay
base_pdf = PdfReader(BytesIO(base_pdf_bytes))
overlay_pdf = PdfReader(overlay_buffer)

# Merge first page
base_page = base_pdf.pages[0]
overlay_page = overlay_pdf.pages[0]
base_page.merge_page(overlay_page)

# Write to output
writer = PdfWriter()
writer.add_page(base_page)
```

## Error Handling

The service handles common errors:

- **404**: Template not found or inactive
- **400**: Invalid data (validation errors)
- **500**: PDF generation failure (check logs)

Errors are logged with details for debugging.

## Limitations & Future Improvements

### Current Limitations

1. **Single Page**: Currently only processes the first page of the base PDF
2. **Google Drive**: Direct Google Drive links need to be converted to direct download URLs
3. **Letter Spacing**: Tracked in schema but requires custom text rendering
4. **Multi-line Text**: Line height is supported but needs text wrapping implementation

### Future Improvements

- [ ] Multi-page PDF support
- [ ] Google Drive API integration
- [ ] Advanced text rendering (wrapping, overflow handling)
- [ ] Cloud storage service (upload generated PDFs)
- [ ] Caching for base PDFs and images
- [ ] Background job processing for large PDFs
- [ ] Webhook notifications when PDF is ready
- [ ] PDF optimization/compression

## Dependencies

Added to `requirements.txt`:

```txt
reportlab>=4.0.9      # PDF creation
PyPDF2>=3.0.1         # PDF manipulation
Pillow>=11.0.0        # Image processing
httpx>=0.26.0         # Async HTTP client
```

## Performance Considerations

- PDFs are generated synchronously (may take time for large files)
- Consider adding caching for frequently used base PDFs
- For high traffic, consider background job processing (Celery, Redis)
- Images and base PDFs are downloaded on each request

## Security Notes

- Validate URLs to prevent SSRF attacks
- Consider rate limiting on PDF generation endpoint
- Implement authentication/authorization for production
- Sanitize user-provided text to prevent injection attacks
