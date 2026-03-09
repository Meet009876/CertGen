"""
Test script to validate element schemas without running the full application.
Run with: python test_validation.py
"""

from app.schemas.elements import (
    StaticTextElement,
    TextVariableElement,
    FixedImageElement,
    ImagePlaceholderElement,
    Position,
    TextFormatting,
    ImageProperties,
    FontFamily,
    TextAlignment,
    ElementType
)
from app.schemas.template import TemplateMetadata, TemplateCreate
from pydantic import ValidationError


def test_static_text():
    """Test static text element validation"""
    print("\n✅ Testing StaticTextElement...")
    
    # Valid element
    element = StaticTextElement(
        position=Position(x=100, y=200),
        content="Invoice Number:",
        formatting=TextFormatting(
            font_family=FontFamily.HELVETICA,
            font_size=14.0,
            bold=True,
            color="#FF0000"
        )
    )
    print(f"   Created: {element.content} at ({element.position.x}, {element.position.y})")
    
    # Invalid - negative coordinates
    try:
        StaticTextElement(
            position=Position(x=-10, y=200),
            content="Test"
        )
        print("   ❌ FAILED: Should reject negative coordinates")
    except ValidationError as e:
        print("   ✓ Correctly rejected negative coordinates")


def test_text_variable():
    """Test text variable element validation"""
    print("\n✅ Testing TextVariableElement...")
    
    # Valid element
    element = TextVariableElement(
        position=Position(x=200, y=300),
        variable_name="customer_name",
        default_value="John Doe",
        max_length=100
    )
    print(f"   Created variable: {element.variable_name}")
    
    # Invalid - Python keyword
    try:
        TextVariableElement(
            position=Position(x=200, y=300),
            variable_name="class",
            default_value="Test"
        )
        print("   ❌ FAILED: Should reject Python keywords")
    except ValidationError as e:
        print("   ✓ Correctly rejected Python keyword as variable name")
    
    # Invalid - invalid variable name
    try:
        TextVariableElement(
            position=Position(x=200, y=300),
            variable_name="123invalid",
            default_value="Test"
        )
        print("   ❌ FAILED: Should reject invalid variable names")
    except ValidationError as e:
        print("   ✓ Correctly rejected invalid variable name (starts with number)")


def test_fixed_image():
    """Test fixed image element validation"""
    print("\n✅ Testing FixedImageElement...")
    
    # Valid element
    element = FixedImageElement(
        position=Position(x=50, y=700),
        image_url="https://example.com/logo.png",
        properties=ImageProperties(
            width=150.0,
            height=50.0,
            maintain_aspect_ratio=True
        )
    )
    print(f"   Created image: {element.image_url}")
    
    # Invalid - zero dimensions
    try:
        FixedImageElement(
            position=Position(x=50, y=700),
            image_url="https://example.com/logo.png",
            properties=ImageProperties(width=0, height=50)
        )
        print("   ❌ FAILED: Should reject zero dimensions")
    except ValidationError as e:
        print("   ✓ Correctly rejected zero width")


def test_image_placeholder():
    """Test image placeholder element validation"""
    print("\n✅ Testing ImagePlaceholderElement...")
    
    # Valid element
    element = ImagePlaceholderElement(
        position=Position(x=400, y=600),
        placeholder_name="customer_signature",
        properties=ImageProperties(width=200, height=100)
    )
    print(f"   Created placeholder: {element.placeholder_name}")
    
    # Invalid - Python keyword
    try:
        ImagePlaceholderElement(
            position=Position(x=400, y=600),
            placeholder_name="return",
            properties=ImageProperties(width=200, height=100)
        )
        print("   ❌ FAILED: Should reject Python keywords")
    except ValidationError as e:
        print("   ✓ Correctly rejected Python keyword as placeholder name")


def test_template_metadata():
    """Test template metadata with multiple elements"""
    print("\n✅ Testing TemplateMetadata...")
    
    # Valid metadata with all element types
    metadata = TemplateMetadata(
        elements=[
            StaticTextElement(
                position=Position(x=50, y=750),
                content="INVOICE"
            ),
            TextVariableElement(
                position=Position(x=50, y=700),
                variable_name="invoice_number"
            ),
            FixedImageElement(
                position=Position(x=50, y=650),
                image_url="https://example.com/logo.png",
                properties=ImageProperties(width=100, height=50)
            ),
            ImagePlaceholderElement(
                position=Position(x=50, y=600),
                placeholder_name="signature",
                properties=ImageProperties(width=150, height=75)
            )
        ]
    )
    print(f"   Created metadata with {len(metadata.elements)} elements")
    
    # Invalid - duplicate element IDs
    try:
        element_id = "same-id-123"
        TemplateMetadata(
            elements=[
                StaticTextElement(
                    id=element_id,
                    position=Position(x=50, y=750),
                    content="Text 1"
                ),
                StaticTextElement(
                    id=element_id,
                    position=Position(x=50, y=700),
                    content="Text 2"
                )
            ]
        )
        print("   ❌ FAILED: Should reject duplicate element IDs")
    except ValidationError as e:
        print("   ✓ Correctly rejected duplicate element IDs")
    
    # Invalid - duplicate variable names
    try:
        TemplateMetadata(
            elements=[
                TextVariableElement(
                    position=Position(x=50, y=750),
                    variable_name="duplicate_var"
                ),
                TextVariableElement(
                    position=Position(x=50, y=700),
                    variable_name="duplicate_var"
                )
            ]
        )
        print("   ❌ FAILED: Should reject duplicate variable names")
    except ValidationError as e:
        print("   ✓ Correctly rejected duplicate variable names")


def test_template_create():
    """Test template creation schema"""
    print("\n✅ Testing TemplateCreate...")
    
    # Valid template
    template = TemplateCreate(
        name="Invoice Template",
        base_pdf_url="https://storage.example.com/invoice.pdf",
        base_pdf_width=612.0,
        base_pdf_height=792.0,
        metadata=TemplateMetadata(
            elements=[
                StaticTextElement(
                    position=Position(x=50, y=750),
                    content="INVOICE",
                    formatting=TextFormatting(font_size=24, bold=True)
                )
            ]
        )
    )
    print(f"   Created template: {template.name}")
    print(f"   PDF dimensions: {template.base_pdf_width}x{template.base_pdf_height} points")
    print(f"   Elements: {len(template.metadata.elements)}")
    
    # Invalid - invalid PDF URL
    try:
        TemplateCreate(
            name="Test",
            base_pdf_url="invalid-url",
            base_pdf_width=612,
            base_pdf_height=792
        )
        print("   ❌ FAILED: Should reject invalid URL")
    except ValidationError as e:
        print("   ✓ Correctly rejected invalid URL")


def test_text_formatting():
    """Test text formatting options"""
    print("\n✅ Testing TextFormatting...")
    
    # Valid formatting
    formatting = TextFormatting(
        font_family=FontFamily.HELVETICA_BOLD,
        font_size=16.0,
        bold=True,
        italic=True,
        underline=True,
        color="#FF5500",
        alignment=TextAlignment.CENTER,
        line_height=1.5,
        letter_spacing=2.0,
        rotation=45.0,
        opacity=0.8
    )
    print(f"   Created formatting: {formatting.font_family}, size={formatting.font_size}")
    
    # Invalid - invalid color
    try:
        TextFormatting(color="red")
        print("   ❌ FAILED: Should reject invalid color format")
    except ValidationError as e:
        print("   ✓ Correctly rejected invalid color format")
    
    # Invalid - font size too large
    try:
        TextFormatting(font_size=300)
        print("   ❌ FAILED: Should reject font size > 200")
    except ValidationError as e:
        print("   ✓ Correctly rejected oversized font")


def main():
    """Run all validation tests"""
    print("=" * 60)
    print("PDF Template Element Validation Tests")
    print("=" * 60)
    
    test_static_text()
    test_text_variable()
    test_fixed_image()
    test_image_placeholder()
    test_template_metadata()
    test_template_create()
    test_text_formatting()
    
    print("\n" + "=" * 60)
    print("✅ All validation tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    main()
