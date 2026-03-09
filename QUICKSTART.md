# Quick Start Guide

## Setup and Run

### 1. Check Python Installation

First, ensure you have Python installed. From the project directory, check which Python you have:

```powershell
# Check Python version
python --version
# OR
py --version
# OR
python3 --version
```

### 2. Create Virtual Environment (Recommended)

```powershell
# Create virtual environment
py -m venv venv
# OR
python -m venv venv

# Activate it
.\venv\Scripts\activate

# You should see (venv) in your terminal prompt
```

### 3. Install Dependencies

```powershell
# Make sure you're in the project directory
# C:\Users\dell\Documents\projectListingBot

pip install -r requirements.txt
```

### 4. Setup Database

You need PostgreSQL installed. If you have it:

```powershell
# Create database (if not exists)
createdb pdf_templates

# Run migration
psql -U postgres -d pdf_templates -f migrations\001_create_templates_table.sql
```

**OR** use SQLite for quick testing (modify `.env`):

```env
DATABASE_URL=sqlite:///./pdf_templates.db
```

Note: SQLite doesn't support all PostgreSQL features (like JSONB), so some queries might not work.

### 5. Configure Environment

```powershell
# Copy example env file
copy .env.example .env

# Edit .env with your settings
notepad .env
```

Minimum required for local testing:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/pdf_templates
APP_DEBUG=True
```

### 6. Test Validation (Optional)

Test that the validation schemas work:

```powershell
# If you have Python installed
python test_validation.py
# OR
py test_validation.py
```

### 7. Run the Application

```powershell
# Make sure virtual environment is activated
# You should see (venv) in prompt

# Run with uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# OR run directly
python -m app.main
```

### 8. Access the API

Open your browser:

- **Interactive API Docs**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## Quick API Test
  
### Using the Browser (Swagger UI)

1. Go to http://localhost:8000/docs
2. Click on `POST /api/templates/`
3. Click "Try it out"
4. Use this example:

```json
{
  "name": "Test Invoice Template",
  "base_pdf_url": "https://example.com/invoice.pdf",
  "base_pdf_width": 612,
  "base_pdf_height": 792,
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
}
```

5. Click "Execute"

### Using cURL (PowerShell)

```powershell
# Create template
curl -X POST "http://localhost:8000/api/templates/" `
  -H "Content-Type: application/json" `
  -d '{
    "name": "Test Template",
    "base_pdf_url": "https://example.com/test.pdf",
    "base_pdf_width": 612,
    "base_pdf_height": 792,
    "metadata": {"elements": []}
  }'

# List templates
curl "http://localhost:8000/api/templates/"

# Get template by name
curl "http://localhost:8000/api/templates/by-name/Test%20Template"
```

## Common Issues

### Python not found

Install Python from https://www.python.org/downloads/ or Microsoft Store.

### PostgreSQL not installed

Download from: https://www.postgresql.org/download/windows/

Or use Docker:
```powershell
docker run --name pdf-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14
```

### Package installation fails

Make sure you're using a recent pip:
```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Port 8000 already in use

Change the port in the run command:
```powershell
uvicorn app.main:app --reload --port 8001
```

## Next Steps

1. Check the full `README.md` for detailed documentation
2. Explore the example template in `examples/invoice_template_example.json`
3. Review the API endpoints at http://localhost:8000/docs
4. Implement PDF generation service
5. Add frontend integration

## Project Structure Overview

```
projectListingBot/
├── app/
│   ├── main.py              # FastAPI app
│   ├── config.py            # Settings
│   ├── database.py          # DB connection
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic validation
│   ├── routes/              # API endpoints
│   └── utils/               # Helper functions
├── migrations/              # SQL migrations
├── examples/                # Example templates
├── requirements.txt         # Dependencies
└── .env                     # Your config (create from .env.example)
```
