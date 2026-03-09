// ─────────────────────────────────────────────────────────────────────────────
// Mirrors of app/schemas/elements.py
// Keep in sync with backend enums & models so data can be POST'd later.
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums ──────────────────────────────────────────────────────────────────

export type FontFamily =
    | 'Helvetica'
    | 'Helvetica-Bold'
    | 'Helvetica-Oblique'
    | 'Helvetica-BoldOblique'
    | 'Times-Roman'
    | 'Times-Bold'
    | 'Times-Italic'
    | 'Times-BoldItalic'
    | 'Courier'
    | 'Courier-Bold'
    | 'Courier-Oblique'
    | 'Courier-BoldOblique';

export const FONT_FAMILIES: FontFamily[] = [
    'Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique',
    'Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic',
    'Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique',
];

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';

export type ElementType = 'static_text' | 'text_variable' | 'fixed_image' | 'image_placeholder';

// ── Sub-models ─────────────────────────────────────────────────────────────

/** Position in PDF coordinate system (points, bottom-left origin) */
export interface Position {
    x: number; // X coordinate in PDF points
    y: number; // Y coordinate in PDF points
}

/** Mirrors TextFormatting from elements.py */
export interface TextFormatting {
    font_family: FontFamily;
    font_size: number;        // gt=0, le=200, in points
    bold: boolean;
    italic: boolean;
    underline: boolean;
    color: string;            // hex e.g. #000000
    alignment: TextAlignment;
    line_height: number;      // ge=0.5, le=3.0 multiplier
    letter_spacing: number;   // ge=-5, le=20 in points
    rotation: number;         // ge=-360, le=360 degrees
    opacity: number;          // ge=0, le=1
}

/** Mirrors ImageBorder from elements.py */
export interface ImageBorder {
    enabled: boolean;         // Whether to draw a border
    color: string;            // Hex e.g. #000000
    thickness: number;        // gt=0, le=50 in PDF points
    corner_radius: number;    // ge=0, le=200 in PDF points (constrained by PyMuPDF to <= min(w,h)/2)
}

/** Mirrors ImageProperties from elements.py */
export interface ImageProperties {
    width: number;             // gt=0 in PDF points
    height: number;            // gt=0 in PDF points
    maintain_aspect_ratio: boolean;
    opacity: number;           // ge=0, le=1
    rotation: number;          // ge=-360, le=360 degrees
    border: ImageBorder;       // Border styling
}

// ── Element Models ──────────────────────────────────────────────────────────

/** Mirrors StaticTextElement */
export interface StaticTextElement {
    id: string;
    type: 'static_text';
    position: Position;
    content: string;           // min_length=1, max_length=10000
    formatting: TextFormatting;
    /** Optional fixed box size in PDF points. When undefined the element auto-sizes. */
    width?: number;
    height?: number;
}

/** Mirrors TextVariableElement */
export interface TextVariableElement {
    id: string;
    type: 'text_variable';
    position: Position;
    content: string;           // Stores the variable name/identifier (min_length=1, max_length=10000)
    formatting: TextFormatting;
    /** Optional fixed box size in PDF points. When undefined the element auto-sizes. */
    width?: number;
    height?: number;
}

/** Mirrors FixedImageElement — image_data_url is frontend-only for preview */
export interface FixedImageElement {
    id: string;
    type: 'fixed_image';
    position: Position;
    asset_id?: string;         // backend identifier for regenerating the link
    image_url: string;         // will be set when uploading to backend later
    image_data_url: string;    // frontend preview only (base64 data URL)
    properties: ImageProperties;
}

/** Mirrors ImagePlaceholderElement */
export interface ImagePlaceholderElement {
    id: string;
    type: 'image_placeholder';
    position: Position;
    asset_id?: string;         // backend identifier for regenerating the link (populated later)
    image_url: string;         // The placeholder identifier acting as dummy URL
    image_data_url: string;    // frontend preview only (base64 data URL)
    properties: ImageProperties;
}

export type TemplateElement =
    | StaticTextElement
    | TextVariableElement
    | FixedImageElement
    | ImagePlaceholderElement;

// ── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_TEXT_FORMATTING: TextFormatting = {
    font_family: 'Helvetica',
    font_size: 14,
    bold: false,
    italic: false,
    underline: false,
    color: '#000000',
    alignment: 'left',
    line_height: 1.2,
    letter_spacing: 0,
    rotation: 0,
    opacity: 1,
};

export const DEFAULT_IMAGE_BORDER: ImageBorder = {
    enabled: false,
    color: '#000000',
    thickness: 1,
    corner_radius: 0,
};

export const DEFAULT_IMAGE_PROPERTIES: ImageProperties = {
    width: 150,
    height: 100,
    maintain_aspect_ratio: true,
    opacity: 1,
    rotation: 0,
    border: { ...DEFAULT_IMAGE_BORDER },
};

// ── Coordinate helpers ──────────────────────────────────────────────────────
// PDF y-axis: origin bottom-left. Screen y-axis: origin top-left.
// Use these when sending data to backend in Stage 2.

export function screenToPdfY(screenY: number, pdfHeightPts: number, scale: number): number {
    return pdfHeightPts - screenY / scale;
}

export function pdfToScreenY(pdfY: number, pdfHeightPts: number, scale: number): number {
    return (pdfHeightPts - pdfY) * scale;
}
