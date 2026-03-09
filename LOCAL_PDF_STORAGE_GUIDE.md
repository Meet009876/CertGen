# Local PDF Storage - User Guide

## Overview
All generated PDFs are automatically saved to local storage with unique filenames organized by date.

---

## 📂 Directory Structure

```
generated_pdfs/
├── 2026-02-16/
│   ├── Invoice_Template_20260216_140522_687283a0.pdf
│   ├── Certificate_Template_20260216_145030_f98e80d9.pdf
│   └── ...
├── 2026-02-17/
│   └── ...
└── ...
```

---

## 📝 Filename Pattern

Generated filenames follow this pattern:
```
{template_name}_{timestamp}_{template_id_short}.pdf
```

**Example:**
```
Invoice_Template_20260216_140522_687283a0.pdf
```

Where:
- `Invoice_Template` - Template name (sanitized, max 30 chars)
- `20260216_140522` - Timestamp (YYYYMMDD_HHMMSS)
- `687283a0` - First 8 characters of template UUID

---

## 🔌 API Endpoints

### 1. Generate PDF (Automatic Save)
```http
POST /api/pdf/generate
```

**Behavior:**
- Generates PDF
- ✅ Automatically saves to local storage
- Returns PDF for download
- Storage info in response headers

**Response Headers:**
```
Content-Disposition: attachment; filename=Invoice_Template_20260216_140522_687283a0.pdf
X-PDF-Filepath: C:\Path\to\generated_pdfs\2026-02-16\Invoice_Template_20260216_140522_687283a0.pdf
X-PDF-Storage-Type: local
X-PDF-Size: 123456
```

---

### 2. List Stored PDFs
```http
GET /api/pdf/stored
GET /api/pdf/stored?date=2026-02-16
```

**Response:**
```json
{
  "count": 2,
  "pdfs": [
    {
      "filename": "Invoice_Template_20260216_140522_687283a0.pdf",
      "relative_path": "2026-02-16/Invoice_Template_20260216_140522_687283a0.pdf",
      "size_bytes": 123456,
      "modified_at": "2026-02-16T14:05:22"
    },
    {
      "filename": "Certificate_Template_20260216_145030_f98e80d9.pdf",
      "relative_path": "2026-02-16/Certificate_Template_20260216_145030_f98e80d9.pdf",
      "size_bytes": 234567,
      "modified_at": "2026-02-16T14:50:30"
    }
  ]
}
```

---

### 3. Retrieve Stored PDF
```http
GET /api/pdf/stored/{date}/{filename}
```

**Example:**
```http
GET /api/pdf/stored/2026-02-16/Invoice_Template_20260216_140522_687283a0.pdf
```

**Response:**
- PDF file download

---

## 🔧 Configuration

### Change Storage Directory
Edit `app/config.py`:

```python
class Settings(BaseSettings):
    PDF_STORAGE_DIR: str = "generated_pdfs"  # Change this
```

Or set environment variable:
```bash
PDF_STORAGE_DIR=/path/to/storage
```

---

## 🚀 Future: Cloud Migration

The storage service is designed for easy cloud migration:

### Current (Local):
```python
from app.services.storage_service import storage_service
```

### Future (S3/GCS/Azure):
Just swap the implementation:
```python
# Option 1: S3
storage_service = S3StorageService(bucket="my-bucket")

# Option 2: Google Cloud Storage
storage_service = GCSStorageService(bucket="my-bucket")

# Option 3: Azure Blob
storage_service = AzureBlobStorageService(container="my-container")
```

No changes needed to route logic!

---

## 📊 Storage Information

### Access Stored PDFs Programmatically

```python
from app.services.storage_service import storage_service

# List all PDFs
pdfs = storage_service.list_pdfs()

# List PDFs for specific date
pdfs = storage_service.list_pdfs(date="2026-02-16")

# Retrieve specific PDF
pdf_bytes = await storage_service.get_pdf("2026-02-16/Invoice_Template_20260216_140522_687283a0.pdf")
```

---

## 🔐 Git Ignore

The `generated_pdfs/` directory is automatically excluded from git via `.gitignore`.

Your generated PDFs will:
- ✅ Be saved locally
- ✅ Be excluded from version control
- ✅ Stay on your machine

---

## 💡 Best Practices

1. **Regular Backups**: Backup the `generated_pdfs/` directory regularly
2. **Cleanup Old Files**: Periodically delete old PDFs to save disk space
3. **Monitor Storage**: Check disk usage if generating many PDFs
4. **Cloud Migration**: When ready, switch to cloud storage for better scalability

---

## 📈 Benefits

✅ **Automatic**: No manual saving required  
✅ **Organized**: Date-based folder structure  
✅ **Unique**: No filename conflicts  
✅ **Trackable**: Full storage info in response headers  
✅ **Retrievable**: Can re-download any generated PDF  
✅ **Cloud-Ready**: Easy migration to S3/GCS/Azure later  

---

## 🎯 Quick Test

1. **Generate a PDF:**
   ```bash
   POST /api/pdf/generate
   ```

2. **Check it was saved:**
   ```bash
   GET /api/pdf/stored
   ```

3. **Verify the file exists:**
   ```bash
   ls generated_pdfs/2026-02-16/
   ```

4. **Re-download it:**
   ```bash
   GET /api/pdf/stored/2026-02-16/filename.pdf
   ```

That's it! Your PDFs are now automatically saved locally! 🎉
