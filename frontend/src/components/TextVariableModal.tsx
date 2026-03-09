"use client";

import { useState, useEffect, useCallback } from "react";
import {
    TextVariableElement,
    TextFormatting,
    DEFAULT_TEXT_FORMATTING,
    FONT_FAMILIES,
    FontFamily,
    TextAlignment,
} from "@/types/template";

interface Props {
    isOpen: boolean;
    initial?: TextVariableElement | null;
    existingKeys: string[];
    onClose: () => void;
    onSave: (el: Omit<TextVariableElement, "id">) => void;
}

// â”€â”€ Local-buffer numeric input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Displays a raw string while typing; only parses+clamps on blur.
// This prevents the browser's min/max constraints from blocking mid-edit.
interface NumericInputProps {
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (v: number) => void;
    className?: string;
}
function NumericInput({ value, min, max, step = 1, onChange, className }: NumericInputProps) {
    const [raw, setRaw] = useState(String(value));

    // Sync if parent value changes (e.g. modal reset)
    useEffect(() => { setRaw(String(value)); }, [value]);

    const commit = () => {
        const parsed = parseFloat(raw);
        if (!isNaN(parsed)) {
            onChange(Math.min(max, Math.max(min, parsed)));
        } else {
            // Revert to current valid value if input is fully invalid
            setRaw(String(value));
        }
    };

    return (
        <input
            type="number"
            step={step}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
            className={className}
        />
    );
}


const ALIGNMENTS: { value: TextAlignment; label: string }[] = [
    { value: "left", label: "Left" },
    { value: "center", label: "Center" },
    { value: "right", label: "Right" },
    { value: "justify", label: "Justify" },
];

export default function TextVariableModal({ isOpen, initial, existingKeys, onClose, onSave }: Props) {
    const [content, setContent] = useState("");
    const [fmt, setFmt] = useState<TextFormatting>({ ...DEFAULT_TEXT_FORMATTING });
    const [error, setError] = useState("");

    // Reset form when opening
    useEffect(() => {
        if (isOpen) {
            setError("");
            if (initial) {
                setContent(initial.content);
                setFmt({ ...initial.formatting });
            } else {
                setContent("");
                setFmt({ ...DEFAULT_TEXT_FORMATTING });
            }
        }
    }, [isOpen, initial]);

    const setFmtField = useCallback(
        <K extends keyof TextFormatting>(key: K, value: TextFormatting[K]) => {
            setFmt((prev) => ({ ...prev, [key]: value }));
        },
        []
    );

    if (!isOpen) return null;

    const handleSave = () => {
        const trimmedContent = content.trim();
        if (!trimmedContent || error || existingKeys.includes(trimmedContent)) return;

        let width = initial?.width;
        let height = initial?.height;

        // Auto-measure dimensions for new elements if width/height aren't set
        if (!width || !height) {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (ctx) {
                // Approximate rendering using standard Canvas API measuring the rendered {{ content }} display
                const fontBase = fmt.font_family.split("-")[0];
                const fontStyleStr = fmt.italic ? "italic " : "";
                const fontWeightStr = fmt.bold ? "bold " : "";
                ctx.font = `${fontStyleStr}${fontWeightStr}${fmt.font_size}px ${fontBase}`;

                const displayContent = `{{ ${trimmedContent} }}`;
                const m = ctx.measureText(displayContent);

                // Add padding for safe rendering and to accommodate letter spacing
                const calculatedWidth = m.width * 1.1 + (displayContent.length * fmt.letter_spacing);
                // Approximate height: (font_size * line_height) + padding
                const calculatedHeight = (fmt.font_size * fmt.line_height) * 1.2;

                width = width ?? Math.max(50, calculatedWidth); // Enforce a minimum width
                height = height ?? Math.max(fmt.font_size + 10, calculatedHeight); // Enforce a minimum height
            } else {
                width = 200;
                height = 60;
            }
        }

        onSave({
            type: "text_variable",
            position: initial?.position ?? { x: 50, y: 50 },
            width,
            height,
            content: trimmedContent,
            formatting: { ...fmt, color: fmt.color.toUpperCase() }
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                        </div>
                        <h2 className="text-base font-bold text-slate-800">
                            {initial ? "Edit Variable Text" : "Add Variable Text"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {/* Content */}
                    <div>
                        <label className="st-label">Variable Name / Key <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={content}
                            onChange={(e) => {
                                // Only allow alphanumeric and underscore
                                const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                                setContent(val);
                                if (existingKeys.includes(val)) {
                                    setError("This key is already in use. Please enter a unique key.");
                                } else {
                                    setError("");
                                }
                            }}
                            placeholder="e.g. invoice_number"
                            className={`st-input font-mono text-sm ${error ? "border-red-400 focus:border-red-400 focus:ring-red-400" : "border-purple-200 focus:border-purple-400 focus:ring-purple-400"}`}
                        />
                        {error ? (
                            <p className="text-xs text-red-500 mt-1 font-semibold">{error}</p>
                        ) : (
                            <p className="text-xs text-slate-400 mt-1">Alphanumeric and underscores only.</p>
                        )}
                    </div>

                    {/* Font Family */}
                    <div>
                        <label className="st-label">Font Family</label>
                        <select
                            value={fmt.font_family}
                            onChange={(e) => setFmtField("font_family", e.target.value as FontFamily)}
                            className="st-input"
                        >
                            {FONT_FAMILIES.map((f) => (
                                <option key={f} value={f}>{f}</option>
                            ))}
                        </select>
                    </div>

                    {/* Font Size + Color row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="st-label">Font Size (pt)</label>
                            <NumericInput
                                value={fmt.font_size}
                                min={1} max={200} step={0.5}
                                onChange={(v) => setFmtField("font_size", v)}
                                className="st-input"
                            />
                        </div>
                        <div>
                            <label className="st-label">Color</label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="color"
                                    value={fmt.color}
                                    onChange={(e) => setFmtField("color", e.target.value)}
                                    className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 flex-shrink-0"
                                />
                                <input
                                    type="text"
                                    value={fmt.color}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setFmtField("color", v);
                                    }}
                                    maxLength={7}
                                    className="st-input font-mono text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Style toggles */}
                    <div>
                        <label className="st-label">Style</label>
                        <div className="flex gap-2">
                            {(["bold", "italic", "underline"] as const).map((key) => (
                                <button
                                    key={key}
                                    onClick={() => setFmtField(key, !fmt[key])}
                                    className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${fmt[key]
                                        ? "bg-purple-600 text-white border-purple-600"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                        } ${key === "bold" ? "font-bold" : ""} ${key === "italic" ? "italic" : ""} ${key === "underline" ? "underline" : ""}`}
                                >
                                    {key.charAt(0).toUpperCase() + key.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Alignment */}
                    <div>
                        <label className="st-label">Alignment</label>
                        <div className="flex gap-2">
                            {ALIGNMENTS.map((a) => (
                                <button
                                    key={a.value}
                                    onClick={() => setFmtField("alignment", a.value)}
                                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${fmt.alignment === a.value
                                        ? "bg-purple-600 text-white border-purple-600"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                        }`}
                                >
                                    {a.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Line height + Letter spacing */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="st-label">Line Height ({fmt.line_height.toFixed(1)}Ã—)</label>
                            <input
                                type="range" min={0.5} max={3} step={0.1}
                                value={fmt.line_height}
                                onChange={(e) => setFmtField("line_height", parseFloat(e.target.value))}
                                className="st-range accent-purple-600"
                            />
                        </div>
                        <div>
                            <label className="st-label">Letter Spacing ({fmt.letter_spacing.toFixed(1)}pt)</label>
                            <input
                                type="range" min={-5} max={20} step={0.5}
                                value={fmt.letter_spacing}
                                onChange={(e) => setFmtField("letter_spacing", parseFloat(e.target.value))}
                                className="st-range accent-purple-600"
                            />
                        </div>
                    </div>

                    {/* Opacity + Rotation */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="st-label">Opacity ({Math.round(fmt.opacity * 100)}%)</label>
                            <input
                                type="range" min={0} max={1} step={0.01}
                                value={fmt.opacity}
                                onChange={(e) => setFmtField("opacity", parseFloat(e.target.value))}
                                className="st-range accent-purple-600"
                            />
                        </div>
                        <div>
                            <label className="st-label">Rotation (deg)</label>
                            <NumericInput
                                value={fmt.rotation}
                                min={-360} max={360} step={1}
                                onChange={(v) => setFmtField("rotation", v)}
                                className="st-input focus:ring-purple-400"
                            />
                        </div>
                    </div>

                    {/* Live Preview */}
                    <div>
                        <label className="st-label">Preview</label>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 min-h-[60px] flex items-center justify-center overflow-hidden">
                            <span
                                style={{
                                    fontFamily: fmt.font_family.split("-")[0], // e.g., 'Helvetica-Bold' becomes 'Helvetica' to let browser pick weight
                                    fontSize: `${Math.min(fmt.font_size, 28)}px`,
                                    fontWeight: fmt.bold ? "bold" : "normal",
                                    fontStyle: fmt.italic ? "italic" : "normal",
                                    textDecoration: fmt.underline ? "underline" : "none",
                                    color: fmt.color,
                                    textAlign: fmt.alignment === "justify" ? "justify" : fmt.alignment,
                                    lineHeight: fmt.line_height,
                                    letterSpacing: `${fmt.letter_spacing}px`,
                                    opacity: fmt.opacity,
                                    transform: fmt.rotation ? `rotate(${fmt.rotation}deg)` : undefined,
                                    display: "block",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    maxWidth: "100%",
                                }}
                            >
                                {content ? `{{ ${content} }}` : "{{ new_variable }}"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white rounded-b-2xl">
                    <button onClick={onClose} className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!content.trim() || !!error || existingKeys.includes(content.trim())}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                    >
                        {initial ? "Update Element" : "Add to Canvas"}
                    </button>
                </div>
            </div>
        </div>
    );
}
