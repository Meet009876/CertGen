# AI PROMPT TEMPLATE
# Copy this entire message and send it to an AI along with your PDF image

---

## YOUR TASK

Analyze the attached PDF image and generate JSON for the PDF Template API.

**Important Coordinate System:**
- Origin is BOTTOM-LEFT (0, 0)
- Y increases UPWARD (Y=792 is top of page)
- Standard page: 612 × 792 points (Letter size)

---

## ELEMENT TYPES:

1. **static_text** - Text that never changes (e.g., "INVOICE", "Customer Name:")
2. **text_variable** - Text that changes per PDF (e.g., invoice numbers, names)
3. **fixed_image** - Images always the same (e.g., company logos)
4. **image_placeholder** - Images that change per PDF (e.g., signatures)

---

## OUTPUT FORMAT:

Generate this exact JSON structure:

```json
{
  "name": "[Descriptive name for this template]",
  "base_pdf_url": "https://raw.githubusercontent.com/user/repo/hash/file.pdf",
  "base_pdf_width": 612.0,
  "base_pdf_height": 792.0,
  "metadata": {
    "elements": [
      {
        "id": "[unique-id]",
        "type": "[static_text|text_variable|fixed_image|image_placeholder]",
        "position": {"x": [number], "y": [number]},
        
        // If text element:
        "content": "[text content]" OR "variable_name": "[name]",
        "formatting": {
          "font_family": "Helvetica",
          "font_size": 12.0,
          "color": "#000000"
        },
        
        // If image element:
        "image_url": "[url]" OR "placeholder_name": "[name]",
        "properties": {
          "width": 100.0,
          "height": 50.0,
          "maintain_aspect_ratio": true
        }
      }
    ]
  }
}
```

---

## ANALYSIS CHECKLIST:

1. ✅ Identify page dimensions (default: 612×792)
2. ✅ Find ALL text elements (labels + data fields)
3. ✅ Find ALL images (logos + signatures)
4. ✅ Estimate Y positions (remember: 0=bottom, 792=top!)
5. ✅ Determine which elements are static vs dynamic
6. ✅ Provide descriptive variable/placeholder names
7. ✅ Estimate font sizes (headings: 24pt, body: 12pt)
8. ✅ Note any colors (hex format: #000000)

---

## EXAMPLE OUTPUT:

```json
{
  "name": "Invoice Template",
  "base_pdf_url": "https://raw.githubusercontent.com/user/repo/abc123/invoice.pdf",
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
        "id": "var-invoice-number",
        "type": "text_variable",
        "position": {"x": 200.0, "y": 700.0},
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

## POSITION GUIDE FOR Y-AXIS:

```
Y = 792 ────────────── TOP (page header)
Y = 700-750 ────────── Title area
Y = 600-700 ────────── Upper content
Y = 300-600 ────────── Main body
Y = 100-300 ────────── Footer area
Y = 0-100 ──────────── Bottom (signatures)
Y = 0 ──────────────── BOTTOM EDGE
```

---

## IMPORTANT REMINDERS:

- Y=0 is BOTTOM, Y=792 is TOP (coordinate system is flipped!)
- Use unique IDs for every element
- Variable names: use snake_case (invoice_number, customer_name)
- Colors: hex format (#000000, #FF0000)
- Font families: Helvetica, Helvetica-Bold, Times-Roman, Courier
- Image URLs: must be direct download links

---

**Now analyze the PDF image and generate the complete JSON!**
