# PyMuPDF Migration - Testing Guide

## Migration Complete! ✅

### What Changed:
- ✅ Removed: ReportLab, PyPDF2
- ✅ Added: PyMuPDF (fitz)
- ✅ Rewritten: PDF generator with native transparency support

---

## Testing Transparent Images

### Test 1: Transparent PNG Image

**Create a template with transparent PNG:**

```json
POST /api/templates/
{
  "name": "Transparency Test Template",
  "base_pdf_url": "https://raw.githubusercontent.com/meet-agarwal/css-hosting/6c941907e05dadc80711f8ae4ce0af523dc17650/basePdf12.pdf",
  "base_pdf_width": 612,
  "base_pdf_height": 792,
  "metadata": {
    "elements": [
      {
        "id": "transparent-logo",
        "type": "fixed_image",
        "position": {"x": 100, "y": 700},
        "image_url": "https://i.postimg.cc/1X9cMHTH/batmanlogo.jpg",
        "properties": {
          "width": 150,
          "height": 150,
          "maintain_aspect_ratio": true
        }
      }
    ]
  }
}
```

**Generate PDF:**
```json
POST /api/pdf/generate
{
  "template_id": "{template_id_from_above}",
  "variables": {},
  "placeholder_images": {}
}
```

---

### Expected Results:

#### Before (ReportLab):
- ❌ Transparent areas render as **BLACK**
- ❌ PNG alpha channel ignored

#### After (PyMuPDF):
- ✅ Transparent areas remain **TRANSPARENT**
- ✅ PNG alpha channel preserved!
- ✅ RGBA images work perfectly

---

## Quick Verification

1. **Check server started:**
   ```bash
   # Look for this in logs:
   INFO: Application startup complete.
   ```

2. **Test with transparent PNG:**
   - Use a PNG with removed background
   - Generate PDF
   - **Verify background is NOT black!**

3. **Test all element types:**
   - [ ] Static text
   - [ ] Text variables
   - [ ] Fixed images (with transparency)
   - [ ] Image placeholders (with transparency)

---

## Rollback (If Needed)

If there are issues, restore the backup:

```bash
cp app/services/pdf_generator_reportlab_backup.py app/services/pdf_generator.py
```

Then edit `requirements.txt`:
```
# Remove
PyMuPDF>=1.23.8

# Add back
reportlab>=4.0.9
PyPDF2>=3.0.1
```

---

## Known Differences

### Font Names:
- ReportLab: `"Helvetica"`
- PyMuPDF: `"helv"`

### Y-Coordinate:
- **No change!** Both use bottom-left origin

### Image Format:
- PyMuPDF saves all images as PNG internally (preserves transparency)

---

## Success Criteria

✅ Server starts without errors  
✅ Static text renders correctly  
✅ Text variables work  
✅ Images display  
✅ **Transparent PNGs have NO black background!**  

---

## Next Steps

1. Test extensively with transparent images
2. If successful, remove backup file
3. Update documentation
4. Celebrate transparency working! 🎉
