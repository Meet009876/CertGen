"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    TemplateElement,
    StaticTextElement,
    TextVariableElement,
    FixedImageElement,
    ImagePlaceholderElement,
    ImageBorder,
    DEFAULT_IMAGE_BORDER,
    TextFormatting,
    FontFamily,
    FONT_FAMILIES,
} from "@/types/template";
import StaticTextModal from "@/components/StaticTextModal";
import FixedImageModal from "@/components/FixedImageModal";
import TextVariableModal from "@/components/TextVariableModal";
import ImagePlaceholderModal from "@/components/ImagePlaceholderModal";

// Use built-in browser API for unique IDs
const uuidv4 = () => crypto.randomUUID();

//  Constants 
const CANVAS_MAX_WIDTH = 780;

//  Local NumericInput (buffer typing, validate on blur) 
function PanelNumericInput({ value, min, max, step = 1, onChange }: {
    value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
}) {
    const [raw, setRaw] = useState(String(value));
    const isFocused = useRef(false);

    // Sync from outside props only when we aren't actively editing
    useEffect(() => {
        if (!isFocused.current) {
            setRaw(String(value));
        }
    }, [value]);

    const commitString = (str: string) => {
        const p = parseFloat(str);
        const valid = !isNaN(p) ? Math.min(max, Math.max(min, p)) : value;
        setRaw(String(valid));
        onChange(valid);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setRaw(val);
        const p = parseFloat(val);
        if (!isNaN(p)) {
            // Live commit valid values, leveraging native browser step/wheel behaviors
            onChange(Math.min(max, Math.max(min, p)));
        }
    };

    return (
        <input type="number" step={step} value={raw}
            onFocus={() => { isFocused.current = true; }}
            onBlur={() => {
                isFocused.current = false;
                commitString(raw);
            }}
            onChange={handleChange}
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                    e.currentTarget.blur();
                }
            }}
            // Add onWheel to let the browser natively handle scrolling if hovered but unfocused
            onWheel={(e) => {
                if (!isFocused.current) {
                    e.currentTarget.focus();
                }
            }}
            className="w-full text-xs border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
        />
    );
}

//  Tiny toggle switch 
function Toggle({ value, onChange, color = "blue" }: { value: boolean; onChange: (v: boolean) => void; color?: "blue" | "emerald" }) {
    const bg = value ? (color === "emerald" ? "bg-emerald-500" : "bg-blue-500") : "bg-slate-200";
    return (
        <button type="button" onClick={() => onChange(!value)}
            className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${bg}`}>
            <span className={`absolute top-0.5 left-0 w-3 h-3 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} />
        </button>
    );
}

//  Section heading 
function PSection({ label }: { label: string }) {
    return <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2 pb-1">{label}</p>;
}

//  Label + control row 
function PRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-2 py-1">
            <span className="text-xs text-slate-500 flex-shrink-0 w-16 leading-tight">{label}</span>
            <div className="flex-1 flex justify-end">{children}</div>
        </div>
    );
}

//  Element overlay component 
type ResizeCorner = "tl" | "tr" | "bl" | "br";

// Smart guide line descriptor (in PDF-point coordinates)
interface Guide {
    type: "h" | "v";
    pos: number;
    color: string; // "#3b82f6" for canvas centre, "#f43f5e" for element edges
}

// Safe helpers for element dimensions (avoid union type narrowing issues)
function getElW(el: TemplateElement): number {
    if (el.type === "fixed_image" || el.type === "image_placeholder") return el.properties.width;
    if (el.type === "static_text" || el.type === "text_variable") return el.width ?? 0;
    return 0;
}
function getElH(el: TemplateElement): number {
    if (el.type === "fixed_image" || el.type === "image_placeholder") return el.properties.height;
    if (el.type === "static_text" || el.type === "text_variable") return el.height ?? 0;
    return 0;
}

// Compute snap position and active guide lines for the dragged element
function computeSnap(
    draggedEl: TemplateElement,
    newX: number,
    newY: number,
    elements: TemplateElement[],
    canvasW: number,
    canvasH: number,
    threshold = 6
): { x: number; y: number; guides: Guide[] } {
    const dW = getElW(draggedEl);
    const dH = getElH(draggedEl);

    const dLeft = newX;
    const dRight = newX + dW;
    const dCenterX = newX + dW / 2;
    const dTop = newY;
    const dBottom = newY + dH;
    const dCenterY = newY + dH / 2;

    // Collect snap targets
    // Canvas centre lines get blue; canvas edges and element lines get red
    const canvasCentreV = canvasW / 2;
    const canvasCentreH = canvasH / 2;
    const vTargets: number[] = [0, canvasCentreV, canvasW];
    const hTargets: number[] = [0, canvasCentreH, canvasH];

    for (const el of elements) {
        if (el.id === draggedEl.id) continue;
        const eW = getElW(el);
        const eH = getElH(el);
        const eX = el.position.x, eY = el.position.y;
        vTargets.push(eX, eX + eW / 2, eX + eW);
        hTargets.push(eY, eY + eH / 2, eY + eH);
    }

    let snapX = newX;
    let snapY = newY;
    const activeGuides: Guide[] = [];

    // Helper: find best snap for a dragged point against a list of targets
    const trySnap = (dragPoint: number, targets: number[], offset: number): number | null => {
        let best: number | null = null;
        let bestDist = threshold;
        for (const t of targets) {
            const dist = Math.abs(dragPoint - t);
            if (dist <= bestDist) { bestDist = dist; best = t - offset; }
        }
        return best;
    };

    // X-axis snap: try left edge, centre, right edge of dragged element
    const snapLeft = trySnap(dLeft, vTargets, 0);
    const snapCenter = trySnap(dCenterX, vTargets, dW / 2);
    const snapRight = trySnap(dRight, vTargets, dW);
    const chosenX = snapLeft ?? snapCenter ?? snapRight;
    if (chosenX !== null) {
        snapX = chosenX;
        const matchedV = snapLeft !== null ? dLeft : snapCenter !== null ? dCenterX : dRight;
        const guidePos = vTargets.find(t => Math.abs(t - matchedV) <= threshold)!;
        const color = guidePos === canvasCentreV ? "#3b82f6" : "#f43f5e";
        activeGuides.push({ type: "v", pos: guidePos, color });
    }

    // Y-axis snap: try top edge, centre, bottom edge
    const snapTop = trySnap(dTop, hTargets, 0);
    const snapMidY = trySnap(dCenterY, hTargets, dH / 2);
    const snapBottom = trySnap(dBottom, hTargets, dH);
    const chosenY = snapTop ?? snapMidY ?? snapBottom;
    if (chosenY !== null) {
        snapY = chosenY;
        const matchedH = snapTop !== null ? dTop : snapMidY !== null ? dCenterY : dBottom;
        const guidePos = hTargets.find(t => Math.abs(t - matchedH) <= threshold)!;
        const color = guidePos === canvasCentreH ? "#3b82f6" : "#f43f5e";
        activeGuides.push({ type: "h", pos: guidePos, color });
    }

    return { x: Math.max(0, snapX), y: Math.max(0, snapY), guides: activeGuides };
}

interface ElementOverlayProps {
    el: TemplateElement;
    scale: number;
    visualScale: number;
    isSelected: boolean;
    onSelect: () => void;
    onDragEnd: (x: number, y: number) => void;
    onResize: (width: number, height: number, x: number, y: number) => void;
    canvasRect: DOMRect | null;
    // Smart guide snapping
    snapFn?: (el: TemplateElement, x: number, y: number) => { x: number; y: number; guides: Guide[] };
    onGuideChange?: (guides: Guide[]) => void;
}

function ElementOverlay({ el, scale, visualScale, isSelected, onSelect, onDragEnd, onResize, canvasRect, snapFn, onGuideChange }: ElementOverlayProps) {
    const dragOffset = useRef({ dx: 0, dy: 0 });
    const isDragging = useRef(false);
    // Always-fresh refs so the move closure never captures a stale snapFn or onGuideChange
    const snapFnRef = useRef(snapFn);
    snapFnRef.current = snapFn;
    const onGuideChangeRef = useRef(onGuideChange);
    onGuideChangeRef.current = onGuideChange;

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect();
        if (!canvasRect) return;
        isDragging.current = true;
        const x = el.position.x * scale;
        const y = el.position.y * scale;
        dragOffset.current = { dx: e.clientX - canvasRect.left - x * visualScale, dy: e.clientY - canvasRect.top - y * visualScale };
        // Capture element ID (not the whole el object) to identify the dragged element
        const elId = el.id;

        const move = (ev: MouseEvent) => {
            if (!isDragging.current || !canvasRect) return;
            const rawX = (ev.clientX - canvasRect.left - dragOffset.current.dx) / (scale * visualScale);
            const rawY = (ev.clientY - canvasRect.top - dragOffset.current.dy) / (scale * visualScale);
            const currentSnapFn = snapFnRef.current;
            if (currentSnapFn) {
                // Build a minimal element object with just id + type info for the snap helper
                // We pass the original el for type/size, which doesn't change during drag
                const snapped = currentSnapFn(el, rawX, rawY);
                onGuideChangeRef.current?.(snapped.guides);
                onDragEnd(snapped.x, snapped.y);
            } else {
                onDragEnd(Math.max(0, rawX), Math.max(0, rawY));
            }
            void elId; // suppress unused warning
        };
        const up = () => {
            isDragging.current = false;
            onGuideChangeRef.current?.([]);
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
    };

    //  Corner resize handler 
    const handleResizeMouseDown = (e: React.MouseEvent, corner: ResizeCorner) => {
        e.stopPropagation();
        e.preventDefault();
        if (!canvasRect) return;

        // Determine starting dimensions depending on element type
        const isText = el.type === "static_text" || el.type === "text_variable";
        const isImage = el.type === "fixed_image" || el.type === "image_placeholder";
        if (!isText && !isImage) return;

        const startMouseX = e.clientX;
        const startMouseY = e.clientY;
        const startW = isImage ? el.properties.width : (el.width ?? 200);
        const startH = isImage ? el.properties.height : (el.height ?? 60);
        const startX = el.position.x;
        const startY = el.position.y;
        // aspect-ratio lock only applies to images with that flag
        const lockAspect = isImage && el.properties.maintain_aspect_ratio;
        const ratio = startW / startH;
        const pxPerPt = scale * visualScale; // screen pixels per PDF point
        const MIN = 10;

        const move = (ev: MouseEvent) => {
            const dx = (ev.clientX - startMouseX) / pxPerPt;  // delta in PDF points
            const dy = (ev.clientY - startMouseY) / pxPerPt;

            let newW = startW, newH = startH, newX = startX, newY = startY;

            if (corner === "br") {
                newW = Math.max(MIN, startW + dx);
                newH = Math.max(MIN, startH + dy);
            } else if (corner === "bl") {
                newW = Math.max(MIN, startW - dx);
                newH = Math.max(MIN, startH + dy);
                newX = startX + (startW - newW);
            } else if (corner === "tr") {
                newW = Math.max(MIN, startW + dx);
                newH = Math.max(MIN, startH - dy);
                newY = startY + (startH - newH);
            } else { // tl
                newW = Math.max(MIN, startW - dx);
                newH = Math.max(MIN, startH - dy);
                newX = startX + (startW - newW);
                newY = startY + (startH - newH);
            }

            // Lock aspect ratio (images only)
            if (lockAspect) {
                if (Math.abs(newW - startW) >= Math.abs(newH - startH)) {
                    newH = newW / ratio;
                    if (corner === "tr" || corner === "tl") newY = startY + (startH - newH);
                } else {
                    newW = newH * ratio;
                    if (corner === "bl" || corner === "tl") newX = startX + (startW - newW);
                }
            }

            onResize(newW, newH, newX, newY);
        };

        const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
    };

    const left = el.position.x * scale;
    const top = el.position.y * scale;

    if (el.type === "static_text" || el.type === "text_variable") {
        const fmt = el.formatting;
        // Corner handle style â€” blue to match text selection colour
        const tHStyle = (cursor: string, pos: React.CSSProperties): React.CSSProperties => ({
            position: "absolute",
            width: 10, height: 10, borderRadius: 2,
            background: el.type === "text_variable" ? "#8b5cf6" : "#3b82f6", // Purple for variables, blue for static
            border: "1.5px solid white",
            cursor,
            zIndex: 20,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.2)",
            display: isSelected ? "block" : "none",
            ...pos,
        });
        const hasBox = el.width !== undefined && el.height !== undefined;
        const displayContent = el.type === "text_variable" ? `{{ ${el.content} }}` : el.content;

        return (
            <div
                onMouseDown={handleMouseDown}
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: "absolute",
                    left, top,
                    ...(hasBox ? {
                        width: el.width! * scale,
                        height: el.height! * scale,
                        overflow: "hidden",
                    } : {
                        maxWidth: "60vw",
                    }),
                    fontFamily: fmt.font_family.split("-")[0],
                    fontSize: fmt.font_size * scale,
                    fontWeight: fmt.bold ? "bold" : "normal",
                    fontStyle: fmt.italic ? "italic" : "normal",
                    textDecoration: fmt.underline ? "underline" : "none",
                    color: fmt.color,
                    textAlign: fmt.alignment === "justify" ? "justify" : fmt.alignment,
                    lineHeight: fmt.line_height,
                    letterSpacing: `${fmt.letter_spacing * scale}px`,
                    opacity: fmt.opacity,
                    transform: fmt.rotation ? `rotate(${fmt.rotation}deg)` : undefined,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    cursor: "move",
                    userSelect: "none",
                    outline: isSelected ? `2px solid ${el.type === "text_variable" ? "#8b5cf6" : "#3b82f6"}` : "2px solid transparent",
                    outlineOffset: "2px",
                    padding: "1px 3px",
                    borderRadius: "2px",
                    background: isSelected ? `rgba(${el.type === "text_variable" ? "139,92,246" : "59,130,246"},0.06)` : "transparent",
                    zIndex: isSelected ? 10 : 5,
                }}
            >
                {displayContent}
                {/* Corner resize handles â€” only visible when selected */}
                <div onMouseDown={(e) => handleResizeMouseDown(e, "tl")} style={tHStyle("nw-resize", { top: -5, left: -5 })} />
                <div onMouseDown={(e) => handleResizeMouseDown(e, "tr")} style={tHStyle("ne-resize", { top: -5, right: -5 })} />
                <div onMouseDown={(e) => handleResizeMouseDown(e, "bl")} style={tHStyle("sw-resize", { bottom: -5, left: -5 })} />
                <div onMouseDown={(e) => handleResizeMouseDown(e, "br")} style={tHStyle("se-resize", { bottom: -5, right: -5 })} />
            </div>
        );
    }

    if (el.type === "fixed_image" || el.type === "image_placeholder") {
        const p = el.properties;
        const b = p.border;
        // Corner handle style helper
        const hStyle = (cursor: string, pos: React.CSSProperties): React.CSSProperties => ({
            position: "absolute",
            width: 10, height: 10, borderRadius: 2,
            background: el.type === "image_placeholder" ? "#f59e0b" : "#10b981", // Amber for placeholder, Green for fixed
            border: "1.5px solid white",
            cursor,
            zIndex: 20,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.2)",
            display: isSelected ? "block" : "none",
            ...pos,
        });

        // Inner div applies the CSS border so overflow:hidden clips border-radius properly
        const innerBorderStyle: React.CSSProperties = b?.enabled
            ? {
                width: "100%",
                height: "100%",
                border: `${b.thickness * scale}px solid ${b.color}`,
                borderRadius: b.corner_radius > 0 ? `${b.corner_radius * scale}px` : undefined,
                overflow: "hidden",
                boxSizing: "border-box",
            }
            : { width: "100%", height: "100%" };

        return (
            <div
                onMouseDown={handleMouseDown}
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: "absolute",
                    left, top,
                    width: p.width * scale,
                    height: p.height * scale,
                    opacity: p.opacity,
                    transform: p.rotation ? `rotate(${p.rotation}deg)` : undefined,
                    cursor: "move",
                    userSelect: "none",
                    outline: isSelected ? `2px solid ${el.type === "image_placeholder" ? "#f59e0b" : "#10b981"}` : "2px solid transparent",
                    outlineOffset: "2px",
                    zIndex: isSelected ? 10 : 5,
                }}
            >
                {/* Inner wrapper: clips image to border-radius, renders border */}
                <div style={innerBorderStyle} className={el.type === "image_placeholder" ? "bg-slate-200 flex items-center justify-center p-2" : ""}>
                    {el.type === "fixed_image" ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={el.image_data_url}
                            alt="element"
                            style={{ width: "100%", height: "100%", objectFit: p.maintain_aspect_ratio ? "contain" : "fill", display: "block" }}
                            draggable={false}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 w-full h-full overflow-hidden text-center">
                            <svg className="w-8 h-8 mb-1 opacity-50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <span className="text-xs font-mono font-medium truncate w-full px-1">{el.image_url}</span>
                        </div>
                    )}
                </div>

                {/* Corner resize handles â€” only visible when selected */}
                <div onMouseDown={(e) => handleResizeMouseDown(e, "tl")} style={hStyle("nw-resize", { top: -5, left: -5 })} />
                <div onMouseDown={(e) => handleResizeMouseDown(e, "tr")} style={hStyle("ne-resize", { top: -5, right: -5 })} />
                <div onMouseDown={(e) => handleResizeMouseDown(e, "bl")} style={hStyle("sw-resize", { bottom: -5, left: -5 })} />
                <div onMouseDown={(e) => handleResizeMouseDown(e, "br")} style={hStyle("se-resize", { bottom: -5, right: -5 })} />
            </div>
        );
    }

    return null;
}


//  Properties Panel 
interface PropsPanelProps {
    element: TemplateElement | null;
    onUpdate: (el: TemplateElement) => void;
    onEdit: () => void;
    getExistingKeys: (excludeId: string) => string[];
}

function PropertiesPanel({ element, onUpdate, onEdit, getExistingKeys }: PropsPanelProps) {
    if (!element) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400 p-6">
                <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
                </svg>
                <p className="text-sm font-medium text-center">Select an element on the canvas to view its properties</p>
            </div>
        );
    }

    // Helpers to update nested fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updFmt = (key: string, val: any) => {
        if (element.type !== "static_text" && element.type !== "text_variable") return;
        let updated: TemplateElement = { ...element, formatting: { ...element.formatting, [key]: val } } as TemplateElement;
        // When font size changes, scale the box height proportionally so it keeps fitting the text
        if (key === "font_size" && element.height !== undefined && element.formatting.font_size > 0) {
            const ratio = (val as number) / element.formatting.font_size;
            updated = { ...updated, height: Math.max(10, Math.round(element.height * ratio)) } as TemplateElement;
        }
        onUpdate(updated);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updImg = (key: string, val: any) => {
        if (element.type !== "fixed_image" && element.type !== "image_placeholder") return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onUpdate({ ...element, properties: { ...(element as any).properties, [key]: val } } as TemplateElement);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updImgBorder = (key: keyof ImageBorder, val: any) => {
        if (element.type !== "fixed_image" && element.type !== "image_placeholder") return;
        // fallback: old elements may not have border field
        const cur = ((element as FixedImageElement).properties.border) ?? { ...DEFAULT_IMAGE_BORDER };
        onUpdate({
            ...element,
            properties: {
                ...(element as any).properties,
                border: { ...cur, [key]: val },
            },
        } as TemplateElement);
    };
    const updPos = (axis: "x" | "y", v: number) =>
        onUpdate({ ...element, position: { ...element.position, [axis]: Math.max(0, v) } } as TemplateElement);

    const getElementBadgeColor = (type: string) => {
        if (type === "static_text") return "bg-blue-100 text-blue-700";
        if (type === "text_variable") return "bg-purple-100 text-purple-700";
        if (type === "fixed_image") return "bg-emerald-100 text-emerald-700";
        if (type === "image_placeholder") return "bg-amber-100 text-amber-700";
        return "bg-slate-100 text-slate-700";
    };

    const getElementDisplayName = (type: string) => {
        if (type === "static_text") return "Static Text";
        if (type === "text_variable") return "Text Variable";
        if (type === "fixed_image") return "Fixed Image";
        if (type === "image_placeholder") return "Image Placeholder";
        return "Element";
    };

    return (
        <div className="h-full overflow-y-auto">
            <div className="px-3 py-3 space-y-0.5">

                {/* Header row */}
                <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${getElementBadgeColor(element.type)}`}>
                        {getElementDisplayName(element.type)}
                    </span>
                    {["static_text", "fixed_image", "text_variable", "image_placeholder"].includes(element.type) && (
                        <button onClick={onEdit}
                            className="text-[11px] text-slate-400 hover:text-blue-600 font-semibold flex items-center gap-1 transition-colors">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Full edit
                        </button>
                    )}
                </div>

                {/*  Position  */}
                <PSection label="Position" />
                <div className="grid grid-cols-2 gap-1.5 pb-1">
                    <div>
                        <p className="text-[10px] text-slate-400 mb-0.5">X</p>
                        <PanelNumericInput value={Math.round(element.position.x)} min={0} max={9999}
                            onChange={(v) => updPos("x", v)} />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 mb-0.5">Y</p>
                        <PanelNumericInput value={Math.round(element.position.y)} min={0} max={9999}
                            onChange={(v) => updPos("y", v)} />
                    </div>
                </div>

                {/*  Text fields (Static or Variable)  */}
                {(element.type === "static_text" || element.type === "text_variable") && (() => {
                    const fmt = element.formatting;
                    return (
                        <>
                            {element.type === "text_variable" && (
                                <>
                                    <PSection label="Data Binding" />
                                    <div className="px-1 mb-3">
                                        <p className="text-[10px] text-slate-400 mb-1">Variable Name / Key</p>
                                        <input
                                            type="text"
                                            value={element.content}
                                            onChange={(e) => {
                                                // Only allow alphanumeric and underscore for variable names
                                                const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                                                if (getExistingKeys(element.id).includes(val)) {
                                                    alert("This key is already in use. Please enter a unique key.");
                                                    return;
                                                }
                                                onUpdate({ ...element, content: val } as TemplateElement);
                                            }}
                                            placeholder="e.g. invoice_number"
                                            className="w-full text-xs font-mono border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
                                        />
                                    </div>
                                </>
                            )}
                            <PSection label="Size" />
                            <PRow label="Width">
                                <div className="w-20">
                                    <PanelNumericInput
                                        value={Math.round(element.width ?? 0)}
                                        min={10} max={5000}
                                        onChange={(v) => onUpdate({ ...element, width: v || undefined } as TemplateElement)}
                                    />
                                </div>
                            </PRow>
                            <PRow label="Height">
                                <div className="w-20">
                                    <PanelNumericInput
                                        value={Math.round(element.height ?? 0)}
                                        min={10} max={5000}
                                        onChange={(v) => onUpdate({ ...element, height: v || undefined } as TemplateElement)}
                                    />
                                </div>
                            </PRow>

                            <PSection label="Font" />
                            <PRow label="Family">
                                <select value={fmt.font_family}
                                    onChange={(e) => updFmt("font_family", e.target.value as FontFamily)}
                                    className="text-xs border border-slate-200 rounded-md px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 max-w-[110px] truncate">
                                    {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </PRow>
                            <PRow label="Size">
                                <div className="w-20">
                                    <PanelNumericInput value={fmt.font_size} min={1} max={200} step={0.5}
                                        onChange={(v) => updFmt("font_size", v)} />
                                </div>
                            </PRow>
                            <PRow label="Color">
                                <div className="flex items-center gap-1.5">
                                    <input type="color" value={fmt.color}
                                        onChange={(e) => updFmt("color", e.target.value)}
                                        className="w-6 h-6 rounded border border-slate-200 cursor-pointer p-0.5 flex-shrink-0" />
                                    <span className="text-xs font-mono text-slate-600">{fmt.color}</span>
                                </div>
                            </PRow>

                            <PSection label="Style" />
                            <PRow label="Bold"><Toggle value={fmt.bold} onChange={(v) => updFmt("bold", v)} /></PRow>
                            <PRow label="Italic"><Toggle value={fmt.italic} onChange={(v) => updFmt("italic", v)} /></PRow>
                            <PRow label="Underline"><Toggle value={fmt.underline} onChange={(v) => updFmt("underline", v)} /></PRow>

                            <PSection label="Transform" />
                            <PRow label="Opacity">
                                <div className="flex items-center gap-1.5 w-full justify-end">
                                    <input type="range" min={0} max={1} step={0.01} value={fmt.opacity}
                                        onChange={(e) => updFmt("opacity", parseFloat(e.target.value))}
                                        className="w-16 accent-blue-500" />
                                    <span className="text-xs text-slate-500 w-7 text-right">{Math.round(fmt.opacity * 100)}%</span>
                                </div>
                            </PRow>
                            <PRow label="Rotation">
                                <div className="w-20">
                                    <PanelNumericInput value={fmt.rotation} min={-360} max={360}
                                        onChange={(v) => updFmt("rotation", v)} />
                                </div>
                            </PRow>

                            {element.type === "static_text" && (
                                <div className="pt-2 border-t border-slate-100 mt-2">
                                    <p className="text-[10px] text-slate-400">
                                        Content, alignment, line-height &amp; letter-spacing â†’ Full edit
                                    </p>
                                </div>
                            )}
                        </>
                    );
                })()}

                {/*  Image fields (Fixed or Placeholder)  */}
                {(element.type === "fixed_image" || element.type === "image_placeholder") && (() => {
                    const p = element.properties;
                    return (
                        <>
                            {element.type === "image_placeholder" && (
                                <>
                                    <PSection label="Data Binding" />
                                    <div className="px-1 mb-3">
                                        <p className="text-[10px] text-slate-400 mb-1">Placeholder Name / Key</p>
                                        <input
                                            type="text"
                                            value={element.image_url}
                                            onChange={(e) => {
                                                // Only allow alphanumeric and underscore
                                                const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                                                if (getExistingKeys(element.id).includes(val)) {
                                                    alert("This key is already in use. Please enter a unique key.");
                                                    return;
                                                }
                                                onUpdate({ ...element, image_url: val } as TemplateElement);
                                            }}
                                            placeholder="e.g. customer_signature"
                                            className="w-full text-xs font-mono border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                                        />
                                    </div>
                                </>
                            )}
                            <PSection label="Size" />
                            <PRow label="Width">
                                <div className="w-20">
                                    <PanelNumericInput value={p.width} min={1} max={5000}
                                        onChange={(v) => updImg("width", v)} />
                                </div>
                            </PRow>
                            <PRow label="Height">
                                <div className="w-20">
                                    <PanelNumericInput value={p.height} min={1} max={5000}
                                        onChange={(v) => updImg("height", v)} />
                                </div>
                            </PRow>
                            <PRow label="Aspect">
                                <Toggle value={p.maintain_aspect_ratio} color="emerald"
                                    onChange={(v) => updImg("maintain_aspect_ratio", v)} />
                            </PRow>

                            <PSection label="Transform" />
                            <PRow label="Opacity">
                                <div className="flex items-center gap-1.5 w-full justify-end">
                                    <input type="range" min={0} max={1} step={0.01} value={p.opacity}
                                        onChange={(e) => updImg("opacity", parseFloat(e.target.value))}
                                        className="w-16 accent-emerald-500" />
                                    <span className="text-xs text-slate-500 w-7 text-right">{Math.round(p.opacity * 100)}%</span>
                                </div>
                            </PRow>
                            <PRow label="Rotation">
                                <div className="w-20">
                                    <PanelNumericInput value={p.rotation} min={-360} max={360}
                                        onChange={(v) => updImg("rotation", v)} />
                                </div>
                            </PRow>

                            {/*  Border  */}
                            <PSection label="Border" />
                            <PRow label="Enable">
                                <Toggle value={p.border?.enabled ?? false} color="emerald"
                                    onChange={(v) => updImgBorder("enabled", v)} />
                            </PRow>
                            {p.border?.enabled && (() => {
                                const b = p.border;
                                // PyMuPDF: radius_ratio = corner_radius / min(w,h), max ratio = 1.0
                                const maxR = Math.floor(Math.min(p.width, p.height));
                                return (
                                    <>
                                        <PRow label="Color">
                                            <div className="flex items-center gap-1.5">
                                                <input type="color" value={b.color}
                                                    onChange={(e) => updImgBorder("color", e.target.value.toUpperCase())}
                                                    className="w-6 h-6 rounded border border-slate-200 cursor-pointer p-0.5 flex-shrink-0" />
                                                <span className="text-xs font-mono text-slate-600">{b.color}</span>
                                            </div>
                                        </PRow>
                                        <PRow label="Thickness">
                                            <div className="w-20">
                                                <PanelNumericInput value={b.thickness} min={0.5} max={50} step={0.5}
                                                    onChange={(v) => updImgBorder("thickness", v)} />
                                            </div>
                                        </PRow>
                                        <div className="py-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-slate-500">Radius</span>
                                                <span className="text-xs font-mono text-slate-600">{Math.min(b.corner_radius, maxR)} pt</span>
                                            </div>
                                            <input type="range" min={0} max={maxR} step={1}
                                                value={Math.min(b.corner_radius, maxR)}
                                                onChange={(e) => updImgBorder("corner_radius", parseFloat(e.target.value))}
                                                className="w-full accent-emerald-500" />
                                            <p className="text-[10px] text-slate-400 mt-0.5">max {maxR} pt</p>
                                        </div>
                                    </>
                                );
                            })()}
                        </>
                    );
                })()}

                <p className="text-[10px] text-slate-300 font-mono pt-3">ID: {element.id.slice(0, 8)}â€¦</p>
            </div>
        </div>
    );
}


//  Save Template Modal 
function SaveTemplateModal({
    isOpen,
    onClose,
    onSave,
    isSaving,
    initialWidth,
    initialHeight,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, certWidth: number, certHeight: number) => Promise<void>;
    isSaving: boolean;
    initialWidth?: number;
    initialHeight?: number;
}) {
    const [name, setName] = useState("");
    const [certWidth, setCertWidth] = useState<number | "">(initialWidth ?? "");
    const [certHeight, setCertHeight] = useState<number | "">(initialHeight ?? "");
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen) {
            setName("");
            setCertWidth(initialWidth ?? "");
            setCertHeight(initialHeight ?? "");
            setError("");
        }
    }, [isOpen, initialWidth, initialHeight]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!name.trim()) {
            setError("Template name cannot be empty");
            return;
        }
        if (certWidth === "" || certWidth <= 0 || certHeight === "" || certHeight <= 0) {
            setError("Certificate width and height must be greater than 0");
            return;
        }
        setError("");
        try {
            await onSave(name.trim(), Number(certWidth), Number(certHeight));
        } catch (err: any) {
            setError(err.message || "Failed to save template");
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-semibold text-slate-800">Save Template</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-5 flex flex-col gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Template Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSave()}
                            placeholder="e.g. Certificate of Completion"
                            className={`w-full text-sm border ${error && !name.trim() ? "border-red-300 focus:ring-red-400" : "border-slate-200 focus:ring-blue-400"} rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2`}
                            autoFocus
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Width (px)</label>
                            <input
                                type="number"
                                value={certWidth}
                                onChange={(e) => setCertWidth(e.target.value === "" ? "" : Number(e.target.value))}
                                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                                placeholder="e.g. 1920"
                                className={`w-full text-sm border ${error && (certWidth === "" || certWidth <= 0) ? "border-red-300 focus:ring-red-400" : "border-slate-200 focus:ring-blue-400"} rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2`}
                                min="1"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Height (px)</label>
                            <input
                                type="number"
                                value={certHeight}
                                onChange={(e) => setCertHeight(e.target.value === "" ? "" : Number(e.target.value))}
                                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                                placeholder="e.g. 1080"
                                className={`w-full text-sm border ${error && (certHeight === "" || certHeight <= 0) ? "border-red-300 focus:ring-red-400" : "border-slate-200 focus:ring-blue-400"} rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2`}
                                min="1"
                            />
                        </div>
                    </div>
                    {error && <p className="text-xs text-red-500">{error}</p>}
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !name.trim() || certWidth === "" || certWidth <= 0 || certHeight === "" || certHeight <= 0}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 shadow-sm hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}


//  Update Confirm Modal 
function UpdateConfirmModal({ isOpen, currentName, currentWidth, currentHeight, onClose, onConfirm, isUpdating }: {
    isOpen: boolean; currentName: string; currentWidth?: number; currentHeight?: number; onClose: () => void;
    onConfirm: (name: string, width: number, height: number, createNew: boolean) => void; isUpdating: boolean;
}) {
    const [name, setName] = useState(currentName);
    const [width, setWidth] = useState<number | "">(currentWidth ?? "");
    const [height, setHeight] = useState<number | "">(currentHeight ?? "");
    const [error, setError] = useState("");
    const [createNew, setCreateNew] = useState(false);
    useEffect(() => {
        if (isOpen) {
            setName(currentName);
            setWidth(currentWidth ?? "");
            setHeight(currentHeight ?? "");
            setError("");
            setCreateNew(false);
        }
    }, [isOpen, currentName, currentWidth, currentHeight]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!name.trim()) { setError("Name cannot be empty"); return; }
        if (width === "" || width <= 0 || height === "" || height <= 0) {
            setError("Certificate width and height must be greater than 0");
            return;
        }
        setError("");
        onConfirm(name.trim(), Number(width), Number(height), createNew);
    };
    return (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-semibold text-slate-800">Update Template</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-5 flex flex-col gap-3">
                    {/* Save as new template toggle */}
                    <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                        <input
                            type="checkbox"
                            checked={createNew}
                            onChange={(e) => {
                                setCreateNew(e.target.checked);
                                if (!e.target.checked) setName(currentName);
                            }}
                            className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-800 transition-colors">
                            Save as a new template
                        </span>
                    </label>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Template Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                            disabled={!createNew}
                            className={`w-full mt-1.5 text-sm border ${error && !name.trim() ? "border-red-300 focus:ring-red-400" : "border-slate-200 focus:ring-blue-400"
                                } rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-colors ${!createNew ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "bg-white"
                                }`}
                            autoFocus={createNew} />
                        {!createNew && (
                            <p className="text-[10px] text-slate-400 mt-1">Check the box above to rename or save as a new template.</p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Width (px)</label>
                            <input type="number" value={width} onChange={(e) => setWidth(e.target.value === "" ? "" : Number(e.target.value))}
                                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                                className={`w-full text-sm border ${error && (width === "" || width <= 0) ? "border-red-300 focus:ring-red-400" : "border-slate-200 focus:ring-blue-400"} rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2`}
                                min="1" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Height (px)</label>
                            <input type="number" value={height} onChange={(e) => setHeight(e.target.value === "" ? "" : Number(e.target.value))}
                                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                                className={`w-full text-sm border ${error && (height === "" || height <= 0) ? "border-red-300 focus:ring-red-400" : "border-slate-200 focus:ring-blue-400"} rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2`}
                                min="1" />
                        </div>
                    </div>
                    {error && <p className="text-xs text-red-500">{error}</p>}
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                    <button onClick={onClose} disabled={isUpdating} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                    <button onClick={handleConfirm} disabled={isUpdating || !name.trim() || width === "" || width <= 0 || height === "" || height <= 0}
                        className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors">
                        {isUpdating ? (createNew ? "Saving…" : "Updating…") : (createNew ? "Save as New" : "Update")}
                    </button>
                </div>
            </div>
        </div>
    );
}

//  Delete Confirm Modal 
function DeleteConfirmModal({ isOpen, templateName, onClose, onConfirm, isDeleting }: {
    isOpen: boolean; templateName: string; onClose: () => void; onConfirm: () => void; isDeleting: boolean;
}) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-red-100 bg-red-50/50">
                    <h3 className="font-semibold text-red-700">Delete Template</h3>
                </div>
                <div className="p-5">
                    <p className="text-sm text-slate-600">Are you sure you want to delete <span className="font-semibold">&ldquo;{templateName}&rdquo;</span>? This can be restored by an admin.</p>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                    <button onClick={onClose} disabled={isDeleting} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                    <button onClick={onConfirm} disabled={isDeleting}
                        className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors">
                        {isDeleting ? "Deletingâ€¦" : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}

//  Dirty Guard Modal 
function DirtyGuardModal({ isOpen, onClose, onDiscard }: { isOpen: boolean; onClose: () => void; onDiscard: () => void; }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800">Unsaved Changes</h3>
                </div>
                <div className="p-5">
                    <p className="text-sm text-slate-600">You have unsaved changes. Discard them and continue?</p>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">Keep Editing</button>
                    <button onClick={onDiscard} className="px-4 py-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg">Discard & Continue</button>
                </div>
            </div>
        </div>
    );
}


//  Success Modal 
function SuccessModal({ isOpen, onClose, message }: { isOpen: boolean; onClose: () => void; message: string }) {
    if (!isOpen) return null;
    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs mx-4 overflow-hidden flex flex-col items-center px-8 py-8 gap-5">
                {/* Animated checkmark circle */}
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-9 h-9 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Template Saved!</h3>
                    <p className="text-sm text-slate-500">{message}</p>
                </div>
                <button
                    onClick={onClose}
                    className="w-full py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm"
                >
                    OK
                </button>
            </div>
        </div>
    );
}


//  Main Page 
type PageMode = "landing" | "create" | "edit";

export default function TemplateDesignPage() {
    // PDF state
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string>("");
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [scale, setScale] = useState(1);
    const [pdfDragOver, setPdfDragOver] = useState(false);
    const [pdfRendering, setPdfRendering] = useState(false);
    // Original PDF dimensions in PDF points (at scale=1), used to auto-populate dialogs
    const [pdfPointSize, setPdfPointSize] = useState<{ width: number; height: number } | null>(null);

    // Elements state
    const [elements, setElements] = useState<TemplateElement[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Modals
    const [stModalOpen, setStModalOpen] = useState(false);
    const [fiModalOpen, setFiModalOpen] = useState(false);
    const [tvModalOpen, setTvModalOpen] = useState(false);
    const [ipModalOpen, setIpModalOpen] = useState(false);
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [editingElement, setEditingElement] = useState<TemplateElement | null>(null);

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const canvasWrapperRef = useRef<HTMLDivElement>(null);
    const centerPanelRef = useRef<HTMLDivElement>(null);  // for ResizeObserver
    const pdfFileRef = useRef<HTMLInputElement>(null);
    const canvasRectRef = useRef<DOMRect | null>(null);
    // Tracks the in-flight pdfjs render task so we can cancel it if a new PDF is loaded
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfRenderTaskRef = useRef<any>(null);

    // Visual scale: shrinks the canvas CSS-only so it always fits the center panel
    const [visualScale, setVisualScale] = useState(1);
    // autoFitScale: the raw fit-to-panel scale (without user zoom)
    const [autoFitScale, setAutoFitScale] = useState(1);
    // User-controlled zoom multiplier (1.0 = no extra zoom)
    const [zoomLevel, setZoomLevel] = useState(1.0);
    // Keep a ref so the ResizeObserver closure always sees the latest zoomLevel
    const zoomLevelRef = useRef(1.0);

    const selectedElement = elements.find((e) => e.id === selectedId) ?? null;

    //  Mode & template 
    const [mode, setMode] = useState<PageMode>("landing");
    const [loadedTemplateId, setLoadedTemplateId] = useState<string | null>(null);
    const [loadedTemplateName, setLoadedTemplateName] = useState<string>("");
    const [isDirty, setIsDirty] = useState(false);
    const [templateList, setTemplateList] = useState<{ id: string; name: string }[]>([]);
    const [dropdownSearch, setDropdownSearch] = useState("");
    const [chosenTemplateId, setChosenTemplateId] = useState("");
    const [templateListLoading, setTemplateListLoading] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [newlySavedTemplateId, setNewlySavedTemplateId] = useState<string>("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDirtyModal, setShowDirtyModal] = useState(false);
    const [dirtyCallback, setDirtyCallback] = useState<(() => void) | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [pendingTemplateLoad, setPendingTemplateLoad] = useState<any | null>(null);
    // Stored when loading an existing template — needed so we can retain the base PDF asset on update
    const [loadedBasePdfAssetId, setLoadedBasePdfAssetId] = useState<string>("");
    const [loadedCertificateWidth, setLoadedCertificateWidth] = useState<number | undefined>(undefined);
    const [loadedCertificateHeight, setLoadedCertificateHeight] = useState<number | undefined>(undefined);
    const [isOpeningTemplate, setIsOpeningTemplate] = useState(false);

    // Smart guides & snapping (always on)
    const [guides, setGuides] = useState<Guide[]>([]);

    //  PDF Upload 
    const loadPdf = useCallback(async (file: File) => {
        setPdfRendering(true);
        const objectUrl = URL.createObjectURL(file);
        setPdfUrl(objectUrl);
        setPdfFile(file);

        try {
            const pdfjsLib = await import("pdfjs-dist");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pdfjs = pdfjsLib as any;

            // Use local worker copy (with cache busting to prevent browser from reusing the old file)
            pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs?v=${pdfjs.version}`;

            const pdfDoc = await pdfjs.getDocument(objectUrl).promise;
            const page = await pdfDoc.getPage(1);
            const viewport = page.getViewport({ scale: 1 });

            // Store original PDF dimensions (in PDF points at scale=1)
            setPdfPointSize({ width: Math.round(viewport.width), height: Math.round(viewport.height) });

            // Scale PDF to fit the editor width
            const s = Math.min(CANVAS_MAX_WIDTH / viewport.width, 1.5);
            const w = Math.round(viewport.width * s);
            const h = Math.round(viewport.height * s);
            setScale(s);
            setCanvasSize({ width: w, height: h });
            // Reset zoom when a new PDF is loaded
            zoomLevelRef.current = 1.0;
            setZoomLevel(1.0);

            const canvas = canvasRef.current!;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d")!;

            // Cancel any in-flight render before starting a new one
            if (pdfRenderTaskRef.current) {
                pdfRenderTaskRef.current.cancel();
                pdfRenderTaskRef.current = null;
            }
            const renderTask = page.render({ canvasContext: ctx, viewport: page.getViewport({ scale: s }) });
            pdfRenderTaskRef.current = renderTask;
            try {
                await renderTask.promise;
            } catch (renderErr: unknown) {
                // Cancelled renders throw — swallow the cancellation, re-throw real errors
                if ((renderErr as { name?: string })?.name !== "RenderingCancelledException") throw renderErr;
            } finally {
                pdfRenderTaskRef.current = null;
            }
        } catch (err) {
            console.error("PDF render error:", err);
        } finally {
            setPdfRendering(false);
        }
    }, []);

    const [isSaving, setIsSaving] = useState(false);

    // Helper function to extract base64 file data into a Blob
    const dataURLtoBlob = (dataurl: string) => {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    };

    const handleSaveTemplate = async (templateName: string, certificateWidth: number, certificateHeight: number) => {
        if (!pdfFile || elements.length === 0) return;
        setIsSaving(true);

        try {
            // STEP 1: PREPARE DRAFT MAP
            const assetMap = new Map<string, File>();

            // Generate asset_id for the base PDF
            const basePdfAssetId = `base_pdf_${uuidv4()}`;
            assetMap.set(basePdfAssetId, pdfFile);

            // Generate asset_ids for FixedImageElements and clean their data_urls from payload
            const cleanedElements = elements.map(el => {
                if (el.type === "fixed_image") {
                    const imgAssetId = `img_${el.id}`;
                    // Convert data URL back to a File
                    const blob = dataURLtoBlob(el.image_data_url!);
                    const file = new File([blob], imgAssetId, { type: blob.type });
                    assetMap.set(imgAssetId, file);

                    // Create cleaned copy with the dummy image_url (the backend Draft & Publish architecture requires an image_url placeholder to later dynamically swap out)
                    const cleanedEl = { ...el, asset_id: imgAssetId, image_url: imgAssetId };
                    // We don't want to send thousands of base64 chars in the DB JSON
                    delete (cleanedEl as Partial<FixedImageElement>).image_data_url;
                    return cleanedEl;
                }
                return el;
            });

            // STEP 2: CREATE DRAFT (POST /api/templates)
            const draftPayload = {
                name: templateName,
                base_pdf_asset_id: basePdfAssetId,
                base_pdf_width: canvasSize.width / scale, // Save at 1x resolution (PDF points)
                base_pdf_height: canvasSize.height / scale,
                certificate_width: certificateWidth,
                certificate_height: certificateHeight,
                metadata: {
                    elements: cleanedElements
                }
            };

            const createRes = await fetch("/api/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(draftPayload)
            });

            if (!createRes.ok) {
                const err = await createRes.json();
                throw new Error(err.detail || "Failed to create template draft");
            }

            const templateData = await createRes.json();
            const templateId = templateData.id;
            setNewlySavedTemplateId(templateId);

            // STEP 3: UPLOAD ASSETS (POST /api/templates/{id}/assets)
            // Function to handle bulk retry logic up to 2 times
            const uploadBulkAssets = async (filesToUpload: Map<string, File>, attempts = 0): Promise<void> => {
                if (filesToUpload.size === 0) return;

                const formData = new FormData();
                filesToUpload.forEach((file, assetId) => {
                    formData.append("asset_ids", assetId);
                    // Pass the assetId as the filename to ensure it matches
                    formData.append("files", file, assetId);
                });

                const uploadRes = await fetch(`/api/templates/${templateId}/assets`, {
                    method: "POST",
                    body: formData,
                });

                if (!uploadRes.ok && attempts < 2) {
                    console.warn(`Asset upload failed, retrying... (Attempt ${attempts + 1})`);
                    // Linear backoff 1s
                    await new Promise(r => setTimeout(r, 1000));
                    return uploadBulkAssets(filesToUpload, attempts + 1);
                }

                if (uploadRes.ok) {
                    const result = await uploadRes.json();

                    // Check for partial successes / individual failures and retry those
                    if (result.status === "partial_success" && attempts < 2) {
                        const failedAssetIds = result.results
                            .filter((r: any) => r.status === "failed")
                            .map((r: any) => r.asset_id);

                        if (failedAssetIds.length > 0) {
                            const newRetryMap = new Map<string, File>();
                            for (const id of failedAssetIds) {
                                if (filesToUpload.has(id)) newRetryMap.set(id, filesToUpload.get(id)!);
                            }
                            console.warn(`Partially failed assets, retrying... (Attempt ${attempts + 1})`);
                            await new Promise(r => setTimeout(r, 1000));
                            return uploadBulkAssets(newRetryMap, attempts + 1);
                        }
                    }

                    if (!uploadRes.ok) {
                        throw new Error("Failed to upload assets after retries.");
                    }
                }
            };

            await uploadBulkAssets(assetMap);

            setSaveModalOpen(false);
            setIsDirty(false);
            setSuccessMessage("Your template has been saved successfully.");
            setShowSuccessModal(true);

        } catch (error) {
            console.error(error);
            throw error; // Let the modal catch and display the error
        } finally {
            setIsSaving(false);
        }
    };

    const router = useRouter();

    // Custom navigation interceptor for the sidebar
    useEffect(() => {
        const handleNavigate = (e: Event) => {
            const customEvent = e as CustomEvent<{ href: string }>;
            if (isDirty) {
                // Intercept navigation
                e.preventDefault();
                setDirtyCallback(() => () => router.push(customEvent.detail.href));
                setShowDirtyModal(true);
            }
        };

        window.addEventListener('app-navigate', handleNavigate);
        return () => window.removeEventListener('app-navigate', handleNavigate);
    }, [isDirty, router]);

    // Browser tab close/refresh interceptor
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const handlePdfDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setPdfDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file?.type === "application/pdf") loadPdf(file);
    };

    // ResizeObserver: keep visual scale & canvas rect in sync with container size
    useEffect(() => {
        const updateRect = () => {
            if (canvasWrapperRef.current) {
                canvasRectRef.current = canvasWrapperRef.current.getBoundingClientRect();
            }
        };

        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const availW = entry.contentRect.width - 48; // subtract padding (2×24px)
                if (canvasSize.width > 0 && availW > 0) {
                    const fit = Math.min(1, availW / canvasSize.width);
                    setAutoFitScale(fit);
                    setVisualScale(fit * zoomLevelRef.current);
                }
            }
            updateRect();
        });

        if (centerPanelRef.current) ro.observe(centerPanelRef.current);
        window.addEventListener("resize", updateRect);
        return () => { ro.disconnect(); window.removeEventListener("resize", updateRect); };
    }, [canvasSize]);

    //  Element CRUD 
    const addElement = (el: TemplateElement) => {
        setElements((prev) => [...prev, el]);
        setSelectedId(el.id);
        setIsDirty(true);
    };

    const updateElement = (el: TemplateElement) => {
        setElements((prev) => prev.map((e) => (e.id === el.id ? el : e)));
        setIsDirty(true);
    };

    const deleteElement = (id: string) => {
        setElements((prev) => prev.filter((e) => e.id !== id));
        if (selectedId === id) setSelectedId(null);
        setIsDirty(true);
    };

    //  Canvas reset 
    const resetCanvas = useCallback(() => {
        setPdfFile(null); setPdfUrl(""); setElements([]); setSelectedId(null);
        setLoadedTemplateId(null); setLoadedTemplateName(""); setIsDirty(false);
        setCanvasSize({ width: 0, height: 0 });
        if (canvasRef.current) { const ctx = canvasRef.current.getContext("2d"); ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); }
        if (pdfFileRef.current) pdfFileRef.current.value = "";
    }, []);

    //  Guard dirty state 
    const guardDirty = (callback: () => void) => {
        if (isDirty) { setDirtyCallback(() => callback); setShowDirtyModal(true); }
        else callback();
    };

    //  Fetch template list 
    const fetchTemplateList = async () => {
        setTemplateListLoading(true); setChosenTemplateId(""); setDropdownSearch("");
        try { const res = await fetch("/api/templates"); if (res.ok) setTemplateList(await res.json()); }
        catch (e) { console.error("Failed to fetch templates", e); }
        finally { setTemplateListLoading(false); }
    };

    //  Load a template into the canvas     // ── Load a template into the canvas ──────────────────────────────────────
    const loadTemplateById = async (templateId: string) => {
        setIsOpeningTemplate(true);
        try {
            const res = await fetch(`/api/templates/${templateId}`);
            if (!res.ok) throw new Error("Failed to load template");
            const data = await res.json();
            // Load base PDF via proxy (bypass browser CORS on Dropbox URLs)
            const proxyUrl = `/api/proxy-asset?url=${encodeURIComponent(data.base_pdf_url)}`;
            const pdfRes = await fetch(proxyUrl);
            const pdfBlob = await pdfRes.blob();
            await loadPdf(new File([pdfBlob], `${data.name}.pdf`, { type: "application/pdf" }));
            // Map elements — fixed_image: use hosted URL directly
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapped = (data.elements_data?.elements ?? []).map((el: any) =>
                el.type === "fixed_image" ? { ...el, image_data_url: el.image_url } : el
            );
            console.log("[loadTemplate] elements_data:", data.elements_data);
            console.log("[loadTemplate] elements count:", mapped.length);
            setElements(mapped);
            setLoadedTemplateId(data.id);
            setLoadedTemplateName(data.name);
            setLoadedCertificateWidth(data.certificate_width);
            setLoadedCertificateHeight(data.certificate_height);
            setLoadedBasePdfAssetId(data.base_pdf_asset_id ?? "");
            setMode("edit");
            setIsDirty(false);
        } catch (e) {
            console.error("Failed to load template:", e);
            alert("Failed to load template. Please try again.");
        } finally {
            setIsOpeningTemplate(false);
        }
    };

    //  Update template 
    const handleUpdateTemplate = async (newName: string, width: number, height: number, createNew: boolean) => {
        if (!loadedTemplateId) return;
        // If "save as new" is checked, delegate to the create flow
        if (createNew) {
            setShowUpdateModal(false);
            await handleSaveTemplate(newName, width, height);
            return;
        }
        setIsUpdating(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const assetMap = new Map<string, File>();
            // Always retain the base PDF asset so orphan-cleanup never removes it
            const retainedIds: string[] = loadedBasePdfAssetId ? [loadedBasePdfAssetId] : [];
            const cleanedElements = elements.map(el => {
                if (el.type === "fixed_image") {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const assetId = (el as any).asset_id || `img_${el.id}`;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const dataUrl = (el as any).image_data_url ?? "";
                    if (dataUrl.startsWith("data:")) {
                        // New image — upload as binary
                        const blob = dataURLtoBlob(dataUrl);
                        assetMap.set(assetId, new File([blob], assetId, { type: blob.type }));
                    } else {
                        // Already hosted — just retain
                        retainedIds.push(assetId);
                    }
                    const cleanedEl = { ...el, asset_id: assetId, image_url: assetId };
                    delete (cleanedEl as Partial<FixedImageElement>).image_data_url;
                    return cleanedEl;
                }
                return el;
            });
            // PUT template metadata
            const putRes = await fetch(`/api/templates/${loadedTemplateId}`, {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newName,
                    base_pdf_width: canvasSize.width / scale,
                    base_pdf_height: canvasSize.height / scale,
                    certificate_width: width,
                    certificate_height: height,
                    metadata: { elements: cleanedElements }
                }),
            });
            if (!putRes.ok) { const err = await putRes.json(); throw new Error(err.detail || "Failed to update template"); }
            // POST assets — always send so base PDF asset_id is included in retained_ids
            {
                const fd = new FormData();
                retainedIds.forEach(id => fd.append("retained_ids", id));
                assetMap.forEach((file, assetId) => { fd.append("asset_ids", assetId); fd.append("files", file, assetId); });
                await fetch(`/api/templates/${loadedTemplateId}/assets`, { method: "POST", body: fd });
            }
            setLoadedTemplateName(newName);
            setLoadedCertificateWidth(width);
            setLoadedCertificateHeight(height);
            setIsDirty(false); setShowUpdateModal(false);
            setSuccessMessage("Your template has been updated successfully.");
            setShowSuccessModal(true);
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "Update failed");
        } finally { setIsUpdating(false); }
    };

    //  Delete template 
    const handleDeleteTemplate = async () => {
        if (!loadedTemplateId) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/templates/${loadedTemplateId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete template");
            setShowDeleteModal(false); resetCanvas(); setMode("landing");
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "Delete failed");
        } finally { setIsDeleting(false); }
    };

    //  Keyboard shortcuts: Ctrl+C / Ctrl+X / Ctrl+V / Delete / Arrow keys 
    const [clipboard, setClipboard] = useState<TemplateElement | null>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            // Don't fire when user is typing in an input / textarea / select
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            if (tag === "input" || tag === "textarea" || tag === "select") return;

            const selected = elements.find((el) => el.id === selectedId) ?? null;

            if (e.key === "Delete" || e.key === "Backspace") {
                if (selectedId) { e.preventDefault(); deleteElement(selectedId); }
            } else if ((e.ctrlKey || e.metaKey) && e.key === "c") {
                if (selected) { e.preventDefault(); setClipboard(selected); }
            } else if ((e.ctrlKey || e.metaKey) && e.key === "x") {
                if (selected) { e.preventDefault(); setClipboard(selected); deleteElement(selected.id); }
            } else if ((e.ctrlKey || e.metaKey) && e.key === "v") {
                if (clipboard) {
                    e.preventDefault();
                    const newEl: TemplateElement = {
                        ...clipboard,
                        id: uuidv4(),
                        position: { x: clipboard.position.x + 20, y: clipboard.position.y + 20 },
                    } as TemplateElement;
                    addElement(newEl);
                }
            } else if (selected && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                e.preventDefault();
                const step = e.shiftKey ? 10 : 1; // Shift = 10pt, plain = 1pt
                const { x, y } = selected.position;
                const newPos = {
                    x: e.key === "ArrowLeft" ? Math.max(0, x - step) : e.key === "ArrowRight" ? x + step : x,
                    y: e.key === "ArrowUp" ? Math.max(0, y - step) : e.key === "ArrowDown" ? y + step : y,
                };
                updateElement({ ...selected, position: newPos } as TemplateElement);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId, elements, clipboard]);


    const handleStaticTextSave = (data: Omit<StaticTextElement, "id">) => {
        if (editingElement) {
            updateElement({ ...editingElement, ...data } as StaticTextElement);
            setEditingElement(null);
        } else {
            addElement({ id: uuidv4(), ...data } as StaticTextElement);
        }
    };

    const handleFixedImageSave = (data: Omit<FixedImageElement, "id">) => {
        if (editingElement) {
            updateElement({ ...editingElement, ...data } as FixedImageElement);
            setEditingElement(null);
        } else {
            addElement({ id: uuidv4(), ...data } as FixedImageElement);
        }
    };

    const openEdit = (el: TemplateElement) => {
        setEditingElement(el);
        if (el.type === "static_text") setStModalOpen(true);
        if (el.type === "fixed_image") setFiModalOpen(true);
        if (el.type === "text_variable") setTvModalOpen(true);
        if (el.type === "image_placeholder") setIpModalOpen(true);
    };

    const handleTextVariableSave = (data: Omit<TextVariableElement, "id">) => {
        if (editingElement) {
            updateElement({ ...editingElement, ...data } as TextVariableElement);
            setEditingElement(null);
        } else {
            addElement({ id: uuidv4(), ...data } as TextVariableElement);
        }
    };

    const handleImagePlaceholderSave = (data: Omit<ImagePlaceholderElement, "id">) => {
        if (editingElement) {
            updateElement({ ...editingElement, ...data } as ImagePlaceholderElement);
            setEditingElement(null);
        } else {
            addElement({ id: uuidv4(), ...data } as ImagePlaceholderElement);
        }
    };

    const handleAddTextVariable = () => {
        setEditingElement(null);
        setTvModalOpen(true);
    };

    const handleAddImagePlaceholder = () => {
        setEditingElement(null);
        setIpModalOpen(true);
    };

    const getExistingKeys = useCallback((excludeId?: string | null) => {
        return elements
            .filter(el =>
                (el.type === "text_variable" || el.type === "image_placeholder") &&
                el.id !== excludeId
            )
            .map(el => el.type === "text_variable" ? el.content : (el as ImagePlaceholderElement).image_url);
    }, [elements]);

    //  Render 

    //  Landing page     // ── Render ─────────────────────────────────────────────────────────────────
    // Compute landing dropdown filter (used in the overlay below)
    const landingFiltered = templateList.filter(t =>
        t.name.toLowerCase().includes(dropdownSearch.toLowerCase())
    );
    return (
        <div className="flex flex-col h-full min-h-0 bg-slate-50 relative" style={{ height: "calc(100vh - 56px)" }}>

            {/* Full-screen Loading Overlay */}
            {isOpeningTemplate && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4 bg-white p-6 rounded-2xl shadow-xl">
                        <svg className="animate-spin h-10 w-10 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="font-semibold text-slate-700">Opening Template...</p>
                    </div>
                </div>
            )}

            {/*  Landing overlay — covers editor when mode === "landing"  */}
            {mode === "landing" && (
                <div className="absolute inset-0 z-50 overflow-y-auto bg-slate-50 flex py-12">
                    <div className="flex flex-col items-center gap-8 max-w-4xl w-full px-6 m-auto">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-slate-800">Template Design</h1>
                            <p className="text-slate-500 mt-2 text-sm">Create a new template or edit an existing one</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 w-full">
                            <button
                                onClick={() => { resetCanvas(); setMode("create"); }}
                                className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-2xl transition-all shadow-sm group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-slate-800 text-sm">Create New Template</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Start from scratch</p>
                                </div>
                            </button>
                            <button
                                onClick={fetchTemplateList}
                                className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-2xl transition-all shadow-sm group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition-colors">
                                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-slate-800 text-sm">Choose Template</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Edit an existing one</p>
                                </div>
                            </button>
                        </div>
                        {(templateListLoading || templateList.length > 0) && (
                            <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6 max-w-2xl">
                                <div className="relative">
                                    <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Search templates by name..."
                                        value={dropdownSearch}
                                        onChange={(e) => setDropdownSearch(e.target.value)}
                                        className="w-full text-base border-2 border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors bg-slate-50 focus:bg-white"
                                    />
                                </div>

                                <div className="flex flex-col gap-2 min-h-[300px]">
                                    {templateListLoading ? (
                                        <div className="flex flex-col items-center justify-center flex-1 text-slate-400 gap-3">
                                            <svg className="animate-spin h-8 w-8 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Loading templates...</span>
                                        </div>
                                    ) : landingFiltered.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center flex-1 text-slate-400">
                                            <svg className="w-12 h-12 opacity-50 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                            <p className="text-gray-500">No templates found matching your search.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 overflow-y-auto pr-1 max-h-[300px]">
                                            {landingFiltered.map((template) => (
                                                <button
                                                    key={template.id}
                                                    onClick={() => setChosenTemplateId(template.id)}
                                                    onDoubleClick={() => loadTemplateById(template.id)}
                                                    disabled={isOpeningTemplate}
                                                    className={`text-left px-5 py-4 border-2 rounded-xl transition-all group flex flex-col gap-1 items-start shadow-sm hover:shadow ${chosenTemplateId === template.id ? "border-emerald-400 bg-emerald-50" : "border-slate-100 hover:border-emerald-300 hover:bg-emerald-50"}`}
                                                >
                                                    <div className="flex items-center gap-3 w-full">
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${chosenTemplateId === template.id ? "bg-white" : "bg-emerald-100 group-hover:bg-white"}`}>
                                                            {isOpeningTemplate && chosenTemplateId === template.id ? (
                                                                <svg className="animate-spin h-5 w-5 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                            ) : (
                                                                <svg className={`w-5 h-5 ${chosenTemplateId === template.id ? "text-emerald-700" : "text-emerald-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-semibold text-slate-800 tracking-tight truncate w-full">
                                                                {template.name}
                                                            </h3>
                                                            <p className={`text-xs font-medium transition-colors ${chosenTemplateId === template.id ? "text-emerald-700" : "text-slate-500 group-hover:text-emerald-600"}`}>
                                                                {isOpeningTemplate && chosenTemplateId === template.id ? "Opening..." : (chosenTemplateId === template.id ? "Selected (Double click)" : "Double click to open")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/*  Top Toolbar  */}
            <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap">

                {/* Back to landing */}
                <button
                    onClick={() => guardDirty(() => { resetCanvas(); setMode("landing"); })}
                    className="text-slate-400 hover:text-slate-700 transition-colors"
                    title="Back to landing"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>

                {/* Mode indicator */}
                {mode === "create" ? (
                    <h1 className="text-base font-bold text-slate-800 mr-2">New Template</h1>
                ) : (
                    <div className="flex items-center gap-2 mr-2">
                        <span className="text-xs text-slate-400 font-medium">Editing:</span>
                        <span className="text-base font-bold text-slate-800">{loadedTemplateName}</span>
                        <div className="relative group">
                            <button
                                onClick={() => guardDirty(fetchTemplateList)}
                                className="text-slate-400 hover:text-emerald-600 transition-colors"
                                title="Switch template"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
                            </button>
                        </div>
                    </div>
                )}

                <div className="h-5 w-px bg-slate-200" />

                {pdfFile && (
                    <>
                        <button
                            onClick={() => { setEditingElement(null); setStModalOpen(true); }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Static Text
                        </button>

                        <button
                            onClick={() => { setEditingElement(null); setFiModalOpen(true); }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
                            Fixed Image
                        </button>

                        <div className="h-4 w-px bg-slate-200 mx-1" />

                        <button
                            onClick={handleAddTextVariable}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                            Variable Text
                        </button>

                        <button
                            onClick={handleAddImagePlaceholder}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Variable Image
                        </button>

                        {mode === "create" && (
                            <div className="ml-auto flex items-center gap-2">
                                <span className="text-xs text-slate-400 font-medium hidden sm:block">{pdfFile.name}</span>
                                <button
                                    onClick={() => resetCanvas()}
                                    className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded"
                                >• Reset</button>
                            </div>
                        )}
                    </>
                )}

                {!pdfFile && mode === "create" && (
                    <button
                        onClick={() => pdfFileRef.current?.click()}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Upload PDF
                    </button>
                )}

                {/* Action buttons */}
                <div className="ml-auto flex items-center gap-2">
                    {mode === "create" ? (
                        <button
                            onClick={() => setSaveModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                            disabled={!pdfFile || elements.length === 0 || isSaving}
                        >
                            Save Template
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => setShowUpdateModal(true)}
                                disabled={isUpdating || isDeleting || !isDirty}
                                className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                            >
                                {isUpdating ? "Updatingâ€¦" : "Update Template"}
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                disabled={isUpdating || isDeleting}
                                className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                            >
                                Delete
                            </button>
                        </>
                    )}
                </div>

                <input ref={pdfFileRef} type="file" accept="application/pdf" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) { loadPdf(f); setIsDirty(true); } }} />
            </div>

            {/*  Main Body  */}
            <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* LEFT: Element List Panel */}
                <div className="w-52 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
                    <div className="px-4 pt-4 pb-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Elements ({elements.length})</p>
                    </div>
                    <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
                        {elements.length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-8 px-3 leading-relaxed">
                                Add elements using the toolbar above
                            </p>
                        )}
                        {elements.map((el, idx) => (
                            <div
                                key={el.id}
                                onClick={() => setSelectedId(el.id)}
                                className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all text-xs ${selectedId === el.id
                                    ? el.type === "static_text" ? "bg-blue-50 border border-blue-200 text-blue-800"
                                        : "bg-emerald-50 border border-emerald-200 text-emerald-800"
                                    : "hover:bg-slate-50 border border-transparent text-slate-600"
                                    }`}
                            >
                                <div className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center 
                                    ${el.type === "static_text" ? "bg-blue-100 text-blue-600" :
                                        el.type === "text_variable" ? "bg-purple-100 text-purple-600" :
                                            el.type === "fixed_image" ? "bg-emerald-100 text-emerald-600" :
                                                "bg-amber-100 text-amber-600"}`}>
                                    {(el.type === "static_text" || el.type === "text_variable") ? (
                                        <span className="font-bold text-[10px]">{el.type === "text_variable" ? "{ }" : "T"}</span>
                                    ) : (
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate">
                                        {(el.type === "static_text" || el.type === "text_variable") ? el.content.slice(0, 20) + (el.content.length > 20 ? "â€¦" : "") :
                                            (el.type === "image_placeholder" ? el.image_url : `Image ${idx + 1}`)}
                                    </p>
                                    <p className="text-[10px] opacity-60 capitalize">{el.type.replace("_", " ")}</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }}
                                    className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-red-500 transition-all"
                                    title="Delete"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CENTER: Canvas — always mounted so canvasRef is always valid */}
                <div
                    ref={centerPanelRef}
                    className="flex-1 overflow-auto bg-slate-200 flex items-start justify-center p-6 relative"
                    onWheel={(e) => {
                        // Ctrl+Wheel → zoom
                        if (e.ctrlKey) {
                            e.preventDefault();
                            const delta = e.deltaY > 0 ? -0.25 : 0.25;
                            const next = Math.min(4.0, Math.max(0.25, parseFloat((zoomLevelRef.current + delta).toFixed(2))));
                            zoomLevelRef.current = next;
                            setZoomLevel(next);
                            setVisualScale(autoFitScale * next);
                        }
                    }}
                >
                    {/* Drop zone overlay — shown when no PDF loaded (create mode without file) */}
                    {!pdfFile && (
                        <div
                            onDragOver={(e) => { e.preventDefault(); setPdfDragOver(true); }}
                            onDragLeave={() => setPdfDragOver(false)}
                            onDrop={handlePdfDrop}
                            onClick={() => pdfFileRef.current?.click()}
                            className={`absolute inset-6 flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all z-10 ${pdfDragOver ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"}`}
                        >
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${pdfDragOver ? "bg-blue-100" : "bg-slate-100"}`}>
                                <svg className={`w-8 h-8 ${pdfDragOver ? "text-blue-500" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <div className="text-center px-6">
                                <p className="text-base font-bold text-slate-700">Drop your PDF template here</p>
                                <p className="text-sm text-slate-400 mt-1">or <span className="text-blue-600 font-semibold">click to browse</span></p>
                            </div>
                        </div>
                    )}

                    {/* Zoom toolbar — shown only when a PDF is loaded */}
                    {pdfFile && (
                        <div
                            style={{
                                position: "absolute",
                                bottom: 16,
                                left: "50%",
                                transform: "translateX(-50%)",
                                zIndex: 40,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                background: "white",
                                borderRadius: 12,
                                boxShadow: "0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
                                padding: "6px 12px",
                                pointerEvents: "auto",
                                userSelect: "none",
                            }}
                        >
                            {/* Zoom-out icon */}
                            <button
                                title="Zoom out (−25%)"
                                onClick={() => {
                                    const next = Math.max(0.25, parseFloat((zoomLevelRef.current - 0.25).toFixed(2)));
                                    zoomLevelRef.current = next;
                                    setZoomLevel(next);
                                    setVisualScale(autoFitScale * next);
                                }}
                                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", color: "#94a3b8", lineHeight: 1 }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
                                </svg>
                            </button>

                            {/* Slider */}
                            <input
                                type="range"
                                min={25}
                                max={400}
                                step={5}
                                value={Math.round(zoomLevel * 100)}
                                onChange={(e) => {
                                    const next = parseFloat((Number(e.target.value) / 100).toFixed(2));
                                    zoomLevelRef.current = next;
                                    setZoomLevel(next);
                                    setVisualScale(autoFitScale * next);
                                }}
                                style={{ width: 120, accentColor: "#3b82f6", cursor: "pointer", height: 4 }}
                            />

                            {/* Zoom-in icon */}
                            <button
                                title="Zoom in (+25%)"
                                onClick={() => {
                                    const next = Math.min(4.0, parseFloat((zoomLevelRef.current + 0.25).toFixed(2)));
                                    zoomLevelRef.current = next;
                                    setZoomLevel(next);
                                    setVisualScale(autoFitScale * next);
                                }}
                                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", color: "#94a3b8", lineHeight: 1 }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                                </svg>
                            </button>

                            {/* Divider */}
                            <div style={{ width: 1, height: 16, background: "#e2e8f0" }} />

                            {/* % label — click to reset to 100% */}
                            <span
                                title="Current zoom level"
                                style={{ fontSize: 12, fontWeight: 700, color: "#475569", minWidth: 36, textAlign: "center", fontVariantNumeric: "tabular-nums" }}
                            >
                                {Math.round(visualScale * 100)}%
                            </span>

                            {/* Fit button */}
                            <button
                                title="Fit canvas to screen"
                                onClick={() => {
                                    zoomLevelRef.current = 1.0;
                                    setZoomLevel(1.0);
                                    setVisualScale(autoFitScale);
                                }}
                                style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, cursor: "pointer", padding: "2px 8px", lineHeight: "18px", whiteSpace: "nowrap" }}
                            >Fit</button>
                        </div>
                    )}

                    {/* Canvas wrapper — always in DOM; hidden via opacity when no PDF */}
                    <div style={{ width: canvasSize.width * visualScale, height: canvasSize.height * visualScale, flexShrink: 0, opacity: pdfFile ? 1 : 0, pointerEvents: pdfFile ? "auto" : "none" }}>
                        <div
                            ref={canvasWrapperRef}
                            className="relative shadow-2xl rounded-sm"
                            style={{ width: canvasSize.width, height: canvasSize.height, transform: `scale(${visualScale})`, transformOrigin: "top left" }}
                            onClick={() => setSelectedId(null)}
                            onMouseMove={() => { if (canvasWrapperRef.current) canvasRectRef.current = canvasWrapperRef.current.getBoundingClientRect(); }}
                        >
                            <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
                            {pdfRendering && (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20 rounded-sm">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
                                        <p className="text-xs text-slate-500">Rendering PDF…</p>
                                    </div>
                                </div>
                            )}
                            {/* Smart guide line overlay */}
                            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 30 }}>
                                {guides.map((g, i) =>
                                    g.type === "v" ? (
                                        <div key={i} style={{
                                            position: "absolute",
                                            left: g.pos * scale,
                                            top: 0,
                                            bottom: 0,
                                            width: 1,
                                            background: g.color,
                                            opacity: 0.9,
                                        }} />
                                    ) : (
                                        <div key={i} style={{
                                            position: "absolute",
                                            top: g.pos * scale,
                                            left: 0,
                                            right: 0,
                                            height: 1,
                                            background: g.color,
                                            opacity: 0.9,
                                        }} />
                                    )
                                )}
                            </div>

                            {elements.map((el) => (
                                <ElementOverlay
                                    key={el.id}
                                    el={el}
                                    scale={scale}
                                    visualScale={visualScale}
                                    isSelected={selectedId === el.id}
                                    onSelect={() => setSelectedId(el.id)}
                                    onDragEnd={(x, y) => updateElement({ ...el, position: { x, y } } as TemplateElement)}
                                    onResize={(w, h, x, y) => {
                                        if (el.type === "fixed_image" || el.type === "image_placeholder") {
                                            updateElement({ ...el, position: { x: Math.max(0, x), y: Math.max(0, y) }, properties: { ...el.properties, width: Math.round(w), height: Math.round(h) } } as TemplateElement);
                                        } else if (el.type === "static_text" || el.type === "text_variable") {
                                            updateElement({ ...el, position: { x: Math.max(0, x), y: Math.max(0, y) }, width: Math.round(w), height: Math.round(h) } as TemplateElement);
                                        }
                                    }}
                                    canvasRect={canvasRectRef.current}
                                    snapFn={(draggedEl, x, y) => computeSnap(
                                        draggedEl, x, y,
                                        elements,
                                        canvasSize.width / scale,
                                        canvasSize.height / scale
                                    )}
                                    onGuideChange={setGuides}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Properties Panel */}
                <div className="w-56 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col">
                    <div className="px-4 pt-4 pb-2 border-b border-slate-100 flex-shrink-0">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Properties</p>
                    </div>
                    <div className="flex-1 min-h-0">
                        <PropertiesPanel
                            element={selectedElement}
                            onUpdate={updateElement}
                            onEdit={() => selectedElement && openEdit(selectedElement)}
                            getExistingKeys={getExistingKeys}
                        />
                    </div>
                </div>
            </div>

            {/*  Modals  */}
            <SaveTemplateModal
                isOpen={saveModalOpen}
                onClose={() => setSaveModalOpen(false)}
                onSave={handleSaveTemplate}
                isSaving={isSaving}
                initialWidth={pdfPointSize?.width}
                initialHeight={pdfPointSize?.height}
            />
            <UpdateConfirmModal
                isOpen={showUpdateModal}
                currentName={loadedTemplateName}
                currentWidth={loadedCertificateWidth ?? pdfPointSize?.width}
                currentHeight={loadedCertificateHeight ?? pdfPointSize?.height}
                onClose={() => setShowUpdateModal(false)}
                onConfirm={handleUpdateTemplate}
                isUpdating={isUpdating}
            />
            <DeleteConfirmModal
                isOpen={showDeleteModal}
                templateName={loadedTemplateName}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteTemplate}
                isDeleting={isDeleting}
            />
            <DirtyGuardModal
                isOpen={showDirtyModal}
                onClose={() => setShowDirtyModal(false)}
                onDiscard={() => { setShowDirtyModal(false); setIsDirty(false); dirtyCallback?.(); setDirtyCallback(null); }}
            />
            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    if (newlySavedTemplateId) {
                        loadTemplateById(newlySavedTemplateId);
                        setNewlySavedTemplateId("");
                    }
                }}
                message={successMessage}
            />
            <StaticTextModal
                isOpen={stModalOpen}
                initial={editingElement?.type === "static_text" ? editingElement : null}
                onClose={() => { setStModalOpen(false); setEditingElement(null); }}
                onSave={handleStaticTextSave}
            />
            <FixedImageModal
                isOpen={fiModalOpen}
                initial={editingElement?.type === "fixed_image" ? editingElement : null}
                onClose={() => { setFiModalOpen(false); setEditingElement(null); }}
                onSave={handleFixedImageSave}
            />
            <TextVariableModal
                isOpen={tvModalOpen}
                initial={editingElement?.type === "text_variable" ? editingElement : null}
                existingKeys={getExistingKeys(editingElement?.id)}
                onClose={() => { setTvModalOpen(false); setEditingElement(null); }}
                onSave={handleTextVariableSave}
            />
            <ImagePlaceholderModal
                isOpen={ipModalOpen}
                initial={editingElement?.type === "image_placeholder" ? editingElement : null}
                existingKeys={getExistingKeys(editingElement?.id)}
                onClose={() => { setIpModalOpen(false); setEditingElement(null); }}
                onSave={handleImagePlaceholderSave}
            />
        </div>
    );
}
