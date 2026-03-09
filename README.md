# PDF Template Backend System

A comprehensive FastAPI backend for managing PDF templates with support for 4 element types: static text, text variables, fixed images, and image placeholders.

## Features

✅ **4 Element Types**
- **Static Text** - Fixed text with comprehensive formatting
- **Text Variables** - Dynamic text placeholders
- **Fixed Images** - Embedded images with known URLs
- **Image Placeholders** - Dynamic image placeholders

✅ **Comprehensive Validation**
- Pydantic schemas for all element types
- Unique constraint validation for IDs, variable names, placeholder names
- Coordinate and dimension validation

✅ **Template Management**
- CRUD operations with pagination
- Search and filtering
- Soft/hard delete support
- Template duplication

✅ **Coordinate System**
- PDF coordinate system (bottom-left origin, points)
- Conversion utilities for frontend (top-left origin, pixels)
- Support for percentage-based coordinates

## Technology Stack

- **Framework**: FastAPI 0.109.0
- **Database**: PostgreSQL with JSONB support
- **ORM**: SQLAlchemy 2.0
- **Validation**: Pydantic 2.5
- **PDF Processing**: ReportLab, PyPDF2

## Project Structure

```
projectListingBot/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app entry point
│   ├── config.py                  # Configuration settings
│   ├── database.py                # Database connection
│   ├── models/
│   │   ├── __init__.py
│   │   └── database.py            # SQLAlchemy ORM models
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── elements.py            # Element validation schemas
│   │   └── template.py            # Template schemas
│   ├── routes/
│   │   ├── __init__.py
│   │   └── templates.py           # Template API endpoints
│   └── utils/
│       ├── __init__.py
│       └── coordinate_converter.py # Coordinate utilities
├── migrations/
│   └── 001_create_templates_table.sql
├── requirements.txt
├── .env.example
└── README.md
```

## Setup

### 1. Prerequisites

- Python 3.9+
- PostgreSQL 12+
- Virtual environment (recommended)

### 2. Installation

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Database Setup

```bash
# Create PostgreSQL database
createdb pdf_templates

# Run migration
psql -U postgres -d pdf_templates -f migrations/001_create_templates_table.sql
```

### 4. Configuration

Copy `.env.example` to `.env` and update values:

```bash
copy .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/pdf_templates
CLOUD_STORAGE_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### 5. Run Application

```bash
# Development mode (with auto-reload)
python -m app.main

# Or using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Visit:
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## API Endpoints

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/templates/` | Create new template |
| GET | `/api/templates/` | List templates (paginated) |
| GET | `/api/templates/{id}` | Get template by ID |
| GET | `/api/templates/by-name/{name}` | Get template by name |
| PUT | `/api/templates/{id}` | Update template |
| DELETE | `/api/templates/{id}` | Delete template (soft/hard) |
| POST | `/api/templates/{id}/duplicate` | Duplicate template |

## Element Types

### 1. Static Text

```json
{
  "type": "static_text",
  "position": {"x": 100.0, "y": 200.0},
  "content": "Invoice Number:",
  "formatting": {
    "font_family": "Helvetica",
    "font_size": 14.0,
    "bold": true,
    "color": "#000000",
    "alignment": "left"
  }
}
```

### 2. Text Variable

```json
{
  "type": "text_variable",
  "position": {"x": 200.0, "y": 200.0},
  "variable_name": "invoice_number",
  "default_value": "INV-0000",
  "formatting": {
    "font_family": "Courier",
    "font_size": 12.0
  },
  "max_length": 50
}
```

### 3. Fixed Image

```json
{
  "type": "fixed_image",
  "position": {"x": 50.0, "y": 700.0},
  "image_url": "https://storage.example.com/logo.png",
  "properties": {
    "width": 150.0,
    "height": 50.0,
    "maintain_aspect_ratio": true
  }
}
```

### 4. Image Placeholder

```json
{
  "type": "image_placeholder",
  "position": {"x": 400.0, "y": 600.0},
  "placeholder_name": "customer_signature",
  "properties": {
    "width": 200.0,
    "height": 100.0
  }
}
```

## Coordinate System

### PDF Coordinates (Storage Format)
- **Origin**: Bottom-left corner
- **Units**: Points (1 pt = 1/72 inch)
- **Y-axis**: Increases upward

### Frontend Conversion

Use `CoordinateConverter` utility:

```python
from app.utils import CoordinateConverter

# Frontend to PDF
x_pdf, y_pdf = CoordinateConverter.frontend_to_pdf(
    x_pixels=400,
    y_pixels=200,
    canvas_width=800,
    canvas_height=1037,
    pdf_width=612,
    pdf_height=792
)

# PDF to Frontend
x_pixels, y_pixels = CoordinateConverter.pdf_to_frontend(
    x_pdf=306,
    y_pdf=639.2,
    pdf_width=612,
    pdf_height=792,
    canvas_width=800,
    canvas_height=1037
)
```

## Text Formatting Options

- **Font Family**: Helvetica, Times, Courier (with bold/italic variants)
- **Font Size**: 0-200 points
- **Styles**: Bold, Italic, Underline
- **Color**: Hex color codes (#RRGGBB)
- **Alignment**: Left, Center, Right, Justify
- **Line Height**: 0.5-3.0 multiplier
- **Letter Spacing**: -5 to 20 points
- **Rotation**: -360 to 360 degrees
- **Opacity**: 0.0-1.0

## Validation

### Unique Constraints
- ✅ Template names must be unique (among active templates)
- ✅ Element IDs must be unique within a template
- ✅ Variable names must be unique within a template
- ✅ Placeholder names must be unique within a template

### Field Validation
- ✅ Coordinates must be non-negative
- ✅ Dimensions must be positive
- ✅ Variable/placeholder names: alphanumeric + underscore, no Python keywords
- ✅ Colors must be valid hex codes
- ✅ URLs must start with http://, https://, s3://, or gs://

## Example Usage

### Create Template

```bash
curl -X POST "http://localhost:8000/api/templates/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invoice Template",
    "base_pdf_url": "https://storage.example.com/invoice.pdf",
    "base_pdf_width": 612.0,
    "base_pdf_height": 792.0,
    "metadata": {
      "elements": [
        {
          "type": "static_text",
          "position": {"x": 50, "y": 750},
          "content": "INVOICE",
          "formatting": {
            "font_size": 24,
            "bold": true
          }
        }
      ]
    }
  }'
```

### List Templates

```bash
curl "http://localhost:8000/api/templates/?page=1&page_size=10&search=invoice"
```

### Get Template by Name

```bash
curl "http://localhost:8000/api/templates/by-name/Invoice%20Template"
```

## Development

### Run Tests

```bash
pytest tests/ -v
```

### Database Migrations

For production, consider using Alembic for migrations:

```bash
# Initialize Alembic
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Initial migration"

# Apply migration
alembic upgrade head
```

## Next Steps

1. **PDF Generation Service** - Implement PDF rendering with template + data
2. **Cloud Storage Integration** - Add S3/GCS upload helpers
3. **Authentication** - Add user authentication and template ownership
4. **Validation Endpoint** - Add endpoint to validate template before saving
5. **Preview Generation** - Generate preview images of templates

## License

MIT
