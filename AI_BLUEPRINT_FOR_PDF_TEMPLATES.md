# AI Blueprint for PDF Template Generation

**Purpose:** This document helps AI analyze a PDF image and generate the JSON needed to create templates and generate PDFs.

---

## 📐 COORDINATE SYSTEM (CRITICAL!)

```
PDF Coordinate System:
- Origin: BOTTOM-LEFT corner (0, 0)
- X-axis: Left to Right (increases →)
- Y-axis: Bottom to Top (increases ↑)
- Units: Points (1 pt = 1/72 inch)

Standard Page Sizes:
- Letter (US): 612 × 792 points (8.5" × 11")
- A4: 595 × 842 points (210mm × 297mm)

Example positions:
┌─────────────────────────────┐ (0, 792) TOP-LEFT
│                             │
│   (50, 750) ← Text here     │
│                             │
│                             │
│             Center          │
│                             │
│                             │
│   (50, 100) ← Signature     │
└─────────────────────────────┘ (0, 0) BOTTOM-LEFT
```

---

## 🎯 TEMPLATE CREATION JSON

### Complete Template Structure

```json
{
  "name": "Descriptive Template Name",
  "base_pdf_url": "https://raw.githubusercontent.com/user/repo/commit-hash/file.pdf",
  "base_pdf_width": 612.0,
  "base_pdf_height": 792.0,
  "metadata": {
    "elements": [
      // Array of elements (see element types below)
    ]
  }
}
```

---

## 🧱 ELEMENT TYPES (All 4 Types)

### 1️⃣ STATIC TEXT
**Use for:** Fixed text that never changes (labels, headings, instructions)

```json
{
  "id": "unique-identifier",
  "type": "static_text",
  "position": {
    "x": 50.0,
    "y": 750.0
  },
  "content": "INVOICE",
  "formatting": {
    "font_family": "Helvetica",        // Options: Helvetica, Helvetica-Bold, Times-Roman, Courier
    "font_size": 24.0,                 // In points (typical: 10-24)
    "bold": true,
    "italic": false,
    "underline": false,
    "color": "#000000",                // Hex color (black)
    "alignment": "left",               // Options: left, center, right, justify
    "line_height": 1.2,                // Line spacing multiplier
    "letter_spacing": 0.0,             // Extra space between letters
    "rotation": 0.0,                   // Degrees (0-360)
    "opacity": 1.0                     // 0.0 (transparent) to 1.0 (opaque)
  }
}
```

### 2️⃣ TEXT VARIABLE
**Use for:** Dynamic text that changes per PDF (names, numbers, dates)

```json
{
  "id": "var-invoice-number",
  "type": "text_variable",
  "position": {
    "x": 200.0,
    "y": 700.0
  },
  "variable_name": "invoice_number",  // Must match key in generation request
  "default_value": "INV-0000",        // Shown if variable not provided
  "formatting": {
    // Same formatting options as static_text
    "font_family": "Courier",
    "font_size": 12.0,
    "color": "#333333"
  },
  "max_length": 50                     // Optional: limit character count
}
```

### 3️⃣ FIXED IMAGE
**Use for:** Images that are always the same (company logos, watermarks)

```json
{
  "id": "company-logo",
  "type": "fixed_image",
  "position": {
    "x": 450.0,
    "y": 720.0
  },
  "image_url": "https://i.postimg.cc/xyz/logo.png",
  "properties": {
    "width": 120.0,                    // In points
    "height": 60.0,                    // In points
    "maintain_aspect_ratio": true,     // If true, image scales proportionally
    "opacity": 1.0,                    // 0.0 to 1.0
    "rotation": 0.0                    // Degrees
  }
}
```

### 4️⃣ IMAGE PLACEHOLDER
**Use for:** Dynamic images that change per PDF (signatures, photos, QR codes)

```json
{
  "id": "signature-placeholder",
  "type": "image_placeholder",
  "position": {
    "x": 50.0,
    "y": 100.0
  },
  "placeholder_name": "customer_signature",  // Must match key in generation request
  "properties": {
    "width": 200.0,
    "height": 80.0,
    "maintain_aspect_ratio": false,
    "opacity": 1.0,
    "rotation": 0.0
  }
}
```

---

## 📝 PDF GENERATION REQUEST

After creating a template, use this JSON to generate PDFs:

```json
{
  "template_id": "uuid-from-template-creation",
  "variables": {
    "invoice_number": "INV-12345",
    "customer_name": "JOHN DOE",
    "date": "2026-02-16",
    "total_amount": "$1,234.56"
  },
  "placeholder_images": {
    "customer_signature": "https://example.com/signatures/john.png",
    "qr_code": "https://example.com/qrcodes/invoice-12345.png"
  }
}
```

---

## 🤖 AI INSTRUCTIONS: How to Analyze a PDF Image

When given a PDF image, follow these steps:

### STEP 1: Identify Page Dimensions
- Assume Letter size (612×792) unless specified
- Or estimate from image aspect ratio

### STEP 2: Identify Elements
Scan the PDF image and categorize each text/image:

**Ask yourself:**
- Is this text ALWAYS the same? → **static_text**
- Does this text change per document? → **text_variable**
- Is this image ALWAYS the same? → **fixed_image**
- Does this image change per document? → **image_placeholder**

### STEP 3: Measure Positions
- **Top section** (750-792): Headers, titles
- **Upper section** (600-750): Primary content
- **Middle section** (300-600): Main body
- **Lower section** (100-300): Footer content
- **Bottom** (0-100): Signatures, page numbers

### STEP 4: Estimate Font Sizes
- **Headings**: 24-28pt
- **Subheadings**: 16-20pt
- **Body text**: 10-14pt
- **Fine print**: 8-10pt

### STEP 5: Detect Colors
- Use hex codes (#000000 for black, #FF0000 for red, etc.)
- Default to #000000 for black text

### STEP 6: Name Variables
Use descriptive snake_case names:
- Good: `invoice_number`, `customer_name`, `total_amount`
- Bad: `var1`, `field2`, `data`

---

## 📋 COMPLETE EXAMPLE

```json
{
  "name": "Professional Invoice Template",
  "base_pdf_url": "https://raw.githubusercontent.com/user/repo/hash/invoice.pdf",
  "base_pdf_width": 612.0,
  "base_pdf_height": 792.0,
  "metadata": {
    "elements": [
      {
        "id": "title",
        "type": "static_text",
        "position": {"x": 50.0, "y": 750.0},
        "content": "INVOICE",
        "formatting": {
          "font_family": "Helvetica-Bold",
          "font_size": 28.0,
          "bold": true,
          "color": "#000000"
        }
      },
      {
        "id": "label-invoice-num",
        "type": "static_text",
        "position": {"x": 50.0, "y": 700.0},
        "content": "Invoice #:",
        "formatting": {
          "font_family": "Helvetica",
          "font_size": 12.0,
          "color": "#333333"
        }
      },
      {
        "id": "var-invoice-num",
        "type": "text_variable",
        "position": {"x": 150.0, "y": 700.0},
        "variable_name": "invoice_number",
        "default_value": "INV-0000",
        "formatting": {
          "font_family": "Courier",
          "font_size": 12.0,
          "color": "#000000"
        }
      },
      {
        "id": "company-logo",
        "type": "fixed_image",
        "position": {"x": 450.0, "y": 720.0},
        "image_url": "https://example.com/logo.png",
        "properties": {
          "width": 120.0,
          "height": 60.0,
          "maintain_aspect_ratio": true
        }
      },
      {
        "id": "signature",
        "type": "image_placeholder",
        "position": {"x": 50.0, "y": 100.0},
        "placeholder_name": "customer_signature",
        "properties": {
          "width": 200.0,
          "height": 80.0,
          "maintain_aspect_ratio": false
        }
      }
    ]
  }
}
```

---

## ⚠️ COMMON MISTAKES TO AVOID

1. **Wrong Coordinates**: Remember Y=0 is BOTTOM, not top!
2. **Missing IDs**: Every element needs a unique ID
3. **Invalid Colors**: Must be hex format (#RRGGBB)
4. **Bad URLs**: Use direct download links (raw.githubusercontent.com for GitHub)
5. **Wrong Font Names**: Use exact names (Helvetica-Bold, not just Bold)
6. **Overlapping Elements**: Check positions don't overlap unintentionally
7. **Mismatched Variable Names**: Generation request must match template variable names

---

## 🎨 FONT FAMILY OPTIONS

```
Standard fonts available:
- Helvetica (regular)
- Helvetica-Bold
- Helvetica-Oblique
- Times-Roman
- Times-Bold
- Courier
- Courier-Bold
```

---

## 🌈 COLOR REFERENCE

```
Common colors:
- Black: #000000
- White: #FFFFFF
- Gray: #808080, #333333, #666666
- Red: #FF0000, #DC143C
- Blue: #0000FF, #1E90FF
- Green: #008000, #00FF00
```

---

## 🔗 URL FORMATS

### GitHub (Raw):
```
✅ https://raw.githubusercontent.com/user/repo/commit-hash/file.pdf
❌ https://github.com/user/repo/blob/main/file.pdf (webpage, not direct)
```

### Image Hosts:
```
✅ https://i.postimg.cc/xyz/image.jpg
✅ https://i.imgur.com/xyz.png
✅ Direct S3/GCS/Azure blob URLs
```

---

## 📊 QUICK REFERENCE TABLE

| Element Type | When to Use | Has URL? | Has Content? | Dynamic? |
|--------------|-------------|----------|--------------|----------|
| static_text | Fixed labels | ❌ | ✅ | ❌ |
| text_variable | Changing text | ❌ | ✅ (default) | ✅ |
| fixed_image | Company logos | ✅ | ❌ | ❌ |
| image_placeholder | Signatures, photos | ❌ | ❌ | ✅ |

---

## 🚀 WORKFLOW

1. **Analyze PDF image** → Identify all elements
2. **Create template JSON** → POST to `/api/templates/`
3. **Get template ID** from response
4. **Create generation JSON** with template ID
5. **Generate PDF** → POST to `/api/pdf/generate`
6. **Download PDF** from response

---

## 💡 PRO TIPS

1. **Start with static text** - It's the easiest to position
2. **Use descriptive IDs** - Makes debugging easier
3. **Test incrementally** - Add one element at a time
4. **Use real URLs** - Test with actual accessible files
5. **Check coordinates** - Y increases upward from bottom!
6. **Default values** - Always provide for variables
7. **Aspect ratios** - Keep true for logos, false for signatures
