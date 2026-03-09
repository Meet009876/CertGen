# Quick PDF Generation Guide

## The PDF Generation Flow

```
Your Request → API → In-Memory Generation → Direct Download to You
(No server storage - streaming response)
```

## How to See Your Generated PDF

### Method 1: Browser (Recommended) ⭐

1. **Open Swagger UI**: http://localhost:8000/docs

2. **Expand "PDF Generation" section**

3. **Click on `POST /api/pdf/generate`**

4. **Click "Try it out"** button

5. **Fill in the request body**:
   ```json
   {
     "template_id": "YOUR_TEMPLATE_ID",
     "variables": {
       "invoice_number": "INV-12345",
       "customer_name": "John Doe"
     }
   }
   ```

6. **Click "Execute"**

7. **Download the PDF** - Look for "Download file" button in the response

8. **PDF is saved to your Downloads folder!**

---

### Method 2: PowerShell/CMD

```powershell
# Get your template ID first
curl http://localhost:8000/api/templates/

# Generate PDF (replace TEMPLATE_ID)
curl -X POST "http://localhost:8000/api/pdf/generate" ^
  -H "Content-Type: application/json" ^
  -d "{\"template_id\":\"TEMPLATE_ID\",\"variables\":{\"invoice_number\":\"INV-001\"}}" ^
  --output certificate.pdf

# PDF saved as certificate.pdf in current directory!
```

---

###  Method 3: Python Script

The test script saves to: **`generated_invoice.pdf`** in project root

```bash
python test_pdf_generation.py
```

---

## Current Storage Design

✅ **Advantages**:
- No disk space used on server
- Faster (no file I/O)
- Unlimited concurrent generations
- No cleanup needed
- Secure (no sensitive data stored)

❌ **Limitations**:
- PDF not cached for re-download
- Must regenerate for each request

---

## Optional: Add Server-Side Storage

If you want to store PDFs on the server, I can add:

1. **Save to local folder** (`/generated_pdfs/`)
2. **Upload to cloud storage** (S3, Google Cloud, Azure)
3. **Add database tracking** (PDF history, download URLs)
4. **Generate unique filenames** (template_name_timestamp.pdf)

Would you like me to implement server-side PDF storage?

---

## Test It Now!

**Quickest way:**
1. Open: http://localhost:8000/docs
2. Click: `POST /api/pdf/generate` 
3. Click: "Try it out"
4. Your template ID: `01cd651f-3414-46e1-9dac-dcc2fde8d429`
5. Click: "Execute"
6. Download your PDF! 🎉
