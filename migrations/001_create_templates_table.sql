-- PDF Template System Database Schema
-- PostgreSQL Migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    base_pdf_url TEXT NOT NULL,
    base_pdf_width FLOAT NOT NULL CHECK (base_pdf_width > 0),
    base_pdf_height FLOAT NOT NULL CHECK (base_pdf_height > 0),
    metadata JSONB NOT NULL DEFAULT '{"elements": []}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    is_active BOOLEAN DEFAULT true
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_metadata ON templates USING GIN (metadata);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE templates IS 'Stores PDF template configurations with base PDF and element metadata';
COMMENT ON COLUMN templates.id IS 'Unique template identifier (UUID)';
COMMENT ON COLUMN templates.name IS 'Human-readable template name';
COMMENT ON COLUMN templates.base_pdf_url IS 'Cloud storage URL for base PDF file';
COMMENT ON COLUMN templates.base_pdf_width IS 'PDF width in points (1pt = 1/72 inch)';
COMMENT ON COLUMN templates.base_pdf_height IS 'PDF height in points';
COMMENT ON COLUMN templates.metadata IS 'JSONB containing all template elements (static text, variables, images, placeholders)';
COMMENT ON COLUMN templates.created_at IS 'Timestamp when template was created';
COMMENT ON COLUMN templates.updated_at IS 'Timestamp when template was last updated';
COMMENT ON COLUMN templates.created_by IS 'User ID who created the template (optional)';
COMMENT ON COLUMN templates.is_active IS 'Soft delete flag (false = deleted)';
