"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    FixedImageElement,
    ImageProperties,
    ImageBorder,
    DEFAULT_IMAGE_PROPERTIES,
    DEFAULT_IMAGE_BORDER,
} from "@/types/template";

interface Props {
    isOpen: boolean;
    initial?: FixedImageElement | null;
    onClose: () => void;
    onSave: (el: Omit<FixedImageElement, "id">) => void;
}

// ── Local-buffer numeric input ────────────────────────────────────────────────
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

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!value)}
            className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${value ? "bg-emerald-500" : "bg-slate-200"}`}
        >
            <span className={`absolute top-1 left-0 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-1"}`} />
        </button>
    );
}


export default function FixedImageModal({ isOpen, initial, onClose, onSave }: Props) {
    const [props, setProps] = useState<ImageProperties>({ ...DEFAULT_IMAGE_PROPERTIES });
    const [border, setBorder] = useState<ImageBorder>({ ...DEFAULT_IMAGE_BORDER });
    const [imageDataUrl, setImageDataUrl] = useState<string>("");
    const [imageName, setImageName] = useState<string>("");
    const [naturalW, setNaturalW] = useState(0);
    const [naturalH, setNaturalH] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            if (initial) {
                setProps({ ...initial.properties });
                setBorder({ ...initial.properties.border });
                setImageDataUrl(initial.image_data_url);
                setImageName("existing image");
            } else {
                setProps({ ...DEFAULT_IMAGE_PROPERTIES });
                setBorder({ ...DEFAULT_IMAGE_BORDER });
                setImageDataUrl("");
                setImageName("");
                setNaturalW(0);
                setNaturalH(0);
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

    const loadFile = (file: File) => {
        if (!file.type.startsWith("image/")) return;
        setImageName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            setImageDataUrl(dataUrl);
            const img = new window.Image();
            img.onload = () => {
                setNaturalW(img.naturalWidth);
                setNaturalH(img.naturalHeight);
                const scale = Math.min(200 / img.naturalWidth, 200 / img.naturalHeight, 1);
                const w = Math.round(img.naturalWidth * scale);
                const h = Math.round(img.naturalHeight * scale);
                setProps((prev) => ({ ...prev, width: w, height: h }));
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) loadFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) loadFile(file);
    };

    const handleWidthChange = (w: number) => {
        if (props.maintain_aspect_ratio && naturalW && naturalH) {
            const ratio = naturalH / naturalW;
            setProps((prev) => ({ ...prev, width: w, height: Math.round(w * ratio) }));
        } else {
            setProp("width", w);
        }
    };

    const handleHeightChange = (h: number) => {
        if (props.maintain_aspect_ratio && naturalW && naturalH) {
            const ratio = naturalW / naturalH;
            setProps((prev) => ({ ...prev, width: Math.round(h * ratio), height: h }));
        } else {
            setProp("height", h);
        }
    };

    if (!isOpen) return null;

    // PyMuPDF formula: radius_ratio = corner_radius / min(w, h), capped at 1.0
    // Max useful corner_radius = min(w, h) — beyond that it's still capped to a stadium shape
    const maxRadius = Math.floor(Math.min(props.width, props.height));

    const handleSave = () => {
        if (!imageDataUrl) return;
        // Clamp corner_radius to PyMuPDF constraint before saving
        const clampedBorder: ImageBorder = {
            ...border,
            corner_radius: Math.min(border.corner_radius, maxRadius),
        };
        onSave({
            type: "fixed_image",
            position: initial?.position ?? { x: 50, y: 50 },
            image_url: "",
            image_data_url: imageDataUrl,
            properties: { ...props, border: clampedBorder },
        });
        onClose();
    };

    // Preview CSS: border + border-radius for live preview
    const previewBorderStyle: React.CSSProperties = border.enabled
        ? {
            border: `${border.thickness}px solid ${border.color}`,
            borderRadius: border.corner_radius > 0 ? `${border.corner_radius}px` : undefined,
            overflow: "hidden",
            boxSizing: "border-box",
        }
        : {};

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-base font-bold text-slate-800">
                            {initial ? "Edit Fixed Image" : "Add Fixed Image"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {/* Image picker */}
                    <div>
                        <label className="st-label">Image File <span className="text-red-500">*</span></label>
                        <div
                            onClick={() => fileRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${dragOver ? "border-emerald-400 bg-emerald-50" :
                                imageDataUrl ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200 hover:border-slate-300 bg-slate-50"
                                }`}
                        >
                            {imageDataUrl ? (
                                <div className="flex flex-col items-center gap-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={imageDataUrl} alt="Preview" className="max-h-32 max-w-full object-contain rounded-lg shadow-sm" />
                                    <p className="text-xs text-emerald-700 font-medium truncate max-w-full">{imageName}</p>
                                    <p className="text-xs text-slate-400">Click to change</p>
                                </div>
                            ) : (
                                <div className="py-4 flex flex-col items-center gap-2 text-slate-400">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-sm">Drop image here or <span className="text-emerald-600 font-semibold">click to browse</span></p>
                                    <p className="text-xs">PNG, JPG, SVG, WebP</p>
                                </div>
                            )}
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        </div>
                    </div>

                    {/* Width / Height */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="st-label">Width (pt)</label>
                            <NumericInput
                                value={props.width}
                                min={1} max={5000} step={1}
                                onChange={(v) => handleWidthChange(v)}
                                className="st-input"
                            />
                        </div>
                        <div>
                            <label className="st-label">Height (pt)</label>
                            <NumericInput
                                value={props.height}
                                min={1} max={5000} step={1}
                                onChange={(v) => handleHeightChange(v)}
                                className="st-input"
                            />
                        </div>
                    </div>

                    {/* Maintain Aspect Ratio */}
                    <div className="flex items-center gap-3">
                        <Toggle value={props.maintain_aspect_ratio} onChange={(v) => setProp("maintain_aspect_ratio", v)} />
                        <span className="text-sm text-slate-700 font-medium">Maintain Aspect Ratio</span>
                        {naturalW > 0 && (
                            <span className="text-xs text-slate-400">({naturalW}×{naturalH}px original)</span>
                        )}
                    </div>

                    {/* Opacity + Rotation */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="st-label">Opacity ({Math.round(props.opacity * 100)}%)</label>
                            <input
                                type="range" min={0} max={1} step={0.01}
                                value={props.opacity}
                                onChange={(e) => setProp("opacity", parseFloat(e.target.value))}
                                className="st-range"
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

                    {/* ── Border Section ── */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        {/* Border header row with toggle */}
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                            <span className="text-sm font-semibold text-slate-700">Border</span>
                            <Toggle value={border.enabled} onChange={(v) => setBorderProp("enabled", v)} />
                        </div>

                        {/* Border controls — only visible when enabled */}
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
                                        className="st-range w-full"
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
                    {imageDataUrl && (
                        <div>
                            <label className="st-label">Preview</label>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-center min-h-[80px] overflow-hidden">
                                <div style={previewBorderStyle}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={imageDataUrl}
                                        alt="preview"
                                        style={{
                                            display: "block",
                                            width: `${Math.min(props.width, 300)}px`,
                                            height: `${Math.min(props.height, 200)}px`,
                                            objectFit: props.maintain_aspect_ratio ? "contain" : "fill",
                                            opacity: props.opacity,
                                            transform: props.rotation ? `rotate(${props.rotation}deg)` : undefined,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white rounded-b-2xl">
                    <button onClick={onClose} className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!imageDataUrl}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                    >
                        {initial ? "Update Element" : "Add to Canvas"}
                    </button>
                </div>
            </div>
        </div>
    );
}
