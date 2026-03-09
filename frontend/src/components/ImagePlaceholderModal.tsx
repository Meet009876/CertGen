"use client";

import { useState, useEffect, useCallback } from "react";
import {
    ImagePlaceholderElement,
    ImageProperties,
    ImageBorder,
    DEFAULT_IMAGE_PROPERTIES,
    DEFAULT_IMAGE_BORDER,
} from "@/types/template";

interface Props {
    isOpen: boolean;
    initial?: ImagePlaceholderElement | null;
    existingKeys: string[];
    onClose: () => void;
    onSave: (el: Omit<ImagePlaceholderElement, "id">) => void;
}

// â”€â”€ Local-buffer numeric input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    useEffect(() => { setRaw(String(value)); }, [value]);
    const commit = () => {
        const parsed = parseFloat(raw);
        if (!isNaN(parsed)) {
            onChange(Math.min(max, Math.max(min, parsed)));
        } else {
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

// â”€â”€ Toggle switch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!value)}
            className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${value ? "bg-amber-500" : "bg-slate-200"}`}
        >
            <span className={`absolute top-1 left-0 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-1"}`} />
        </button>
    );
}


export default function ImagePlaceholderModal({ isOpen, initial, existingKeys, onClose, onSave }: Props) {
    const [props, setProps] = useState<ImageProperties>({ ...DEFAULT_IMAGE_PROPERTIES });
    const [border, setBorder] = useState<ImageBorder>({ ...DEFAULT_IMAGE_BORDER });
    const [imageUrl, setImageUrl] = useState<string>("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen) {
            setError("");
            if (initial) {
                setProps({ ...initial.properties });
                setBorder({ ...initial.properties.border });
                setImageUrl(initial.image_url);
            } else {
                setProps({ ...DEFAULT_IMAGE_PROPERTIES, width: 100, height: 100 });
                setBorder({ ...DEFAULT_IMAGE_BORDER, enabled: true, color: "#94a3b8" });
                setImageUrl("");
            }
        }
    }, [isOpen, initial]);

    const setProp = useCallback(
        <K extends keyof ImageProperties>(key: K, value: ImageProperties[K]) => {
            setProps((prev) => ({ ...prev, [key]: value }));
        },
        []
    );

    const setBorderProp = useCallback(
        <K extends keyof ImageBorder>(key: K, value: ImageBorder[K]) => {
            setBorder((prev) => ({ ...prev, [key]: value }));
        },
        []
    );

    if (!isOpen) return null;

    // PyMuPDF formula: radius_ratio = corner_radius / min(w, h), capped at 1.0
    const maxRadius = Math.floor(Math.min(props.width, props.height));

    const handleSave = () => {
        const trimmedUrl = imageUrl.trim();
        if (!trimmedUrl || error || existingKeys.includes(trimmedUrl)) return;
        // Clamp corner_radius to PyMuPDF constraint before saving
        const clampedBorder: ImageBorder = {
            ...border,
            corner_radius: Math.min(border.corner_radius, maxRadius),
        };
        onSave({
            type: "image_placeholder",
            position: initial?.position ?? { x: 50, y: 150 },
            image_url: trimmedUrl,
            image_data_url: "", // Not used visually for placeholder
            properties: { ...props, border: clampedBorder },
        });
        onClose();
    };

    // Preview CSS: border + border-radius for live preview
    const previewBorderStyle: React.CSSProperties = {
        ...(border.enabled
            ? {
                border: `${border.thickness}px solid ${border.color}`,
                borderRadius: border.corner_radius > 0 ? `${border.corner_radius}px` : undefined,
                overflow: "hidden",
                boxSizing: "border-box",
            }
            : {}),
        width: `${Math.min(props.width, 300)}px`,
        height: `${Math.min(props.height, 200)}px`,
        opacity: props.opacity,
        transform: props.rotation ? `rotate(${props.rotation}deg)` : undefined,
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-base font-bold text-slate-800">
                            {initial ? "Edit Variable Image" : "Add Variable Image"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {/* Placeholder Name */}
                    <div>
                        <label className="st-label">Placeholder Name / Key <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={imageUrl}
                            onChange={(e) => {
                                // Only allow alphanumeric and underscore
                                const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                                setImageUrl(val);
                                if (existingKeys.includes(val)) {
                                    setError("This key is already in use. Please enter a unique key.");
                                } else {
                                    setError("");
                                }
                            }}
                            placeholder="e.g. customer_signature"
                            className={`st-input font-mono text-sm ${error ? "border-red-400 focus:border-red-400 focus:ring-red-400" : "border-amber-200 focus:border-amber-400 focus:ring-amber-400"}`}
                        />
                        {error ? (
                            <p className="text-xs text-red-500 mt-1 font-semibold">{error}</p>
                        ) : (
                            <p className="text-xs text-slate-400 mt-1">Alphanumeric and underscores only.</p>
                        )}
                    </div>

                    {/* Width / Height */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="st-label">Width (pt)</label>
                            <NumericInput
                                value={props.width}
                                min={1} max={5000} step={1}
                                onChange={(v) => setProp("width", v)}
                                className="st-input"
                            />
                        </div>
                        <div>
                            <label className="st-label">Height (pt)</label>
                            <NumericInput
                                value={props.height}
                                min={1} max={5000} step={1}
                                onChange={(v) => setProp("height", v)}
                                className="st-input"
                            />
                        </div>
                    </div>

                    {/* Opacity + Rotation */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="st-label">Opacity ({Math.round(props.opacity * 100)}%)</label>
                            <input
                                type="range" min={0} max={1} step={0.01}
                                value={props.opacity}
                                onChange={(e) => setProp("opacity", parseFloat(e.target.value))}
                                className="st-range accent-amber-500"
                            />
                        </div>
                        <div>
                            <label className="st-label">Rotation (deg)</label>
                            <NumericInput
                                value={props.rotation}
                                min={-360} max={360} step={1}
                                onChange={(v) => setProp("rotation", v)}
                                className="st-input"
                            />
                        </div>
                    </div>

                    {/* â”€â”€ Border Section â”€â”€ */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        {/* Border header row with toggle */}
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                            <span className="text-sm font-semibold text-slate-700">Border</span>
                            <Toggle value={border.enabled} onChange={(v) => setBorderProp("enabled", v)} />
                        </div>

                        {/* Border controls â€” only visible when enabled */}
                        {border.enabled && (
                            <div className="px-4 py-4 space-y-4 bg-white">
                                {/* Color + Thickness */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="st-label">Color</label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <input
                                                type="color"
                                                value={border.color}
                                                onChange={(e) => setBorderProp("color", e.target.value.toUpperCase())}
                                                className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0.5 flex-shrink-0"
                                            />
                                            <span className="text-xs font-mono text-slate-600">{border.color}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="st-label">Thickness (pt)</label>
                                        <NumericInput
                                            value={border.thickness}
                                            min={0.5} max={50} step={0.5}
                                            onChange={(v) => setBorderProp("thickness", v)}
                                            className="st-input"
                                        />
                                    </div>
                                </div>

                                {/* Corner Radius slider */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="st-label !mb-0">Corner Radius (pt)</label>
                                        <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                            {border.corner_radius} pt
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={maxRadius}
                                        step={1}
                                        value={Math.min(border.corner_radius, maxRadius)}
                                        onChange={(e) => setBorderProp("corner_radius", parseFloat(e.target.value))}
                                        className="st-range w-full accent-amber-500"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                                        <span>0</span>
                                        <span className="text-slate-400">max {maxRadius} pt = min(w,h)</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Preview */}
                    <div>
                        <label className="st-label">Preview</label>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-center min-h-[80px] overflow-hidden">
                            <div style={previewBorderStyle} className="bg-slate-200 flex flex-col items-center justify-center text-slate-400 text-center relative">
                                <svg className="w-8 h-8 mb-1 opacity-50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="text-xs font-mono font-medium truncate w-full px-1">{imageUrl || "placeholder_name"}</span>
                            </div>
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
                        disabled={!imageUrl.trim() || !!error || existingKeys.includes(imageUrl.trim())}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                    >
                        {initial ? "Update Element" : "Add to Canvas"}
                    </button>
                </div>
            </div>
        </div>
    );
}
