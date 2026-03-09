"use client";

import { useState, useEffect } from "react";
import { TemplateElement, TextVariableElement, ImagePlaceholderElement } from "@/types/template";

interface GenerationFormProps {
    templateId: string;
    onCancel: () => void;
    initialData?: any;
    editCertificateNumber?: string | null;
}

export default function GenerationForm({ templateId, onCancel, initialData, editCertificateNumber }: GenerationFormProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successResult, setSuccessResult] = useState<{ url: string; filename: string } | null>(null);

    // Template elements categorized
    const [textVariables, setTextVariables] = useState<TextVariableElement[]>([]);
    const [imagePlaceholders, setImagePlaceholders] = useState<ImagePlaceholderElement[]>([]);

    // Form state
    const [textValues, setTextValues] = useState<Record<string, string>>({});
    const [imageValues, setImageValues] = useState<Record<string, string>>({}); // base64 strings

    // Fetch template details to get variables and placeholders
    useEffect(() => {
        const fetchTemplateDetails = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/templates/${templateId}`);
                if (!res.ok) throw new Error("Failed to load template details");
                const data = await res.json();

                const elements: TemplateElement[] = data.elements_data?.elements || [];

                // Filter and sort for consistent ordering
                const txtVars = elements.filter((el): el is TextVariableElement => el.type === "text_variable");
                const imgVars = elements.filter((el): el is ImagePlaceholderElement => el.type === "image_placeholder");

                setTextVariables(txtVars);
                setImagePlaceholders(imgVars);

                // Initialize state
                const initialText: Record<string, string> = {};
                txtVars.forEach(v => {
                    initialText[v.content] = initialData?.variables?.[v.content] || "";
                });
                setTextValues(initialText);

                if (initialData?.placeholder_images) {
                    setImageValues(initialData.placeholder_images);
                }


            } catch (err: any) {
                console.error("Template load error:", err);
                setError(err.message || "An error occurred loading the template.");
            } finally {
                setIsLoading(false);
            }
        };

        if (templateId) {
            fetchTemplateDetails();
        }
    }, [templateId]);

    // Handle text input changes
    const handleTextChange = (key: string, value: string) => {
        setTextValues(prev => ({ ...prev, [key]: value }));
    };

    // Handle image file selection and conversion to Base64
    const handleImageChange = (key: string, file: File | null) => {
        if (!file) {
            setImageValues(prev => {
                const updated = { ...prev };
                delete updated[key];
                return updated;
            });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setImageValues(prev => ({ ...prev, [key]: base64String }));
        };
        reader.readAsDataURL(file);
    };

    // Form Submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation: Verify all fields are filled
        const missingText = textVariables.some(tv => !textValues[tv.content]?.trim());
        const missingImage = imagePlaceholders.some(ip => !imageValues[ip.image_url]);

        if (missingText || missingImage) {
            setError("Please fill out all the dynamic fields before generating the certificate.");
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            let requestPayload: any = {
                template_id: templateId,
                variables: textValues
            };

            let res;
            if (editCertificateNumber) {
                // Editing format: split into existing and replaced
                const existing: string[] = [];
                const replaced: Record<string, string> = {};

                Object.entries(imageValues).forEach(([key, val]) => {
                    const isObjectVal = val && typeof val === 'object' && (val as any).url;
                    const valString = isObjectVal ? (val as any).url : val;

                    if (typeof valString === 'string' && valString.startsWith("data:")) {
                        // User uploaded a new image, send the binary
                        replaced[key] = valString;
                    } else {
                        // Existing image URL (or untouched object), push key only
                        existing.push(key);
                    }
                });

                requestPayload.placeholder_images = { existing, replaced };
                res = await fetch(`/api/pdf/edit/${editCertificateNumber}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestPayload)
                });
            } else {
                // Generating format: flat dict
                requestPayload.placeholder_images = imageValues;
                res = await fetch("/api/pdf/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestPayload)
                });
            }

            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.detail || "Failed to generate PDF");
            }

            // Handle binary PDF response for download
            const blob = await res.blob();
            // Try to extract filename from custom header or fallback
            const contentDisposition = res.headers.get("content-disposition");
            let filename = "generated_certificate.pdf";

            if (contentDisposition && contentDisposition.includes("filename=")) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match && match[1]) filename = match[1];
            }

            // Create temporary download link and store it in state instead of auto-clicking
            const url = window.URL.createObjectURL(blob);
            setSuccessResult({ url, filename });

        } catch (err: any) {
            console.error("Generation error:", err);
            setError(err.message || "An error occurred while generating the PDF.");
        } finally {
            setIsGenerating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-4 bg-white rounded-2xl shadow-sm border border-slate-200">
                <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading form fields...</span>
            </div>
        );
    }

    if (error && !textVariables.length && !imagePlaceholders.length) {
        return (
            <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-100 flex flex-col gap-4 text-center">
                <p className="font-medium">{error}</p>
                <div className="flex justify-center mt-2">
                    <button onClick={onCancel} className="px-4 py-2 bg-white text-slate-700 rounded shadow-sm hover:bg-slate-50 transition-colors text-sm font-medium">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // Success Screen
    if (successResult) {
        return (
            <div className="bg-white rounded-2xl flex flex-col items-center justify-center py-8 px-4 md:px-8 border border-slate-200 shadow-sm w-full">

                {/* Header Section */}
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600 shadow-sm border border-emerald-200">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-1 tracking-tight">
                        {editCertificateNumber ? "Update Complete!" : "Generation Complete!"}
                    </h2>
                    <p className="text-slate-500 text-sm md:text-base">
                        Your certificate <span className="font-semibold text-slate-700">{successResult.filename}</span> is ready.
                    </p>
                </div>

                {/* PDF Preview Container - Full Width */}
                <div className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl p-4 shadow-sm mb-6 flex flex-col items-center">
                    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[300px] md:min-h-[450px]">
                        <div className="bg-slate-100 border-b border-slate-200 py-2 px-4 flex items-center justify-between z-10 shrink-0">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                Document Preview
                            </span>
                        </div>
                        <div className="flex-1 relative bg-slate-200/50">
                            <iframe
                                src={`${successResult.url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                                className="absolute top-0 left-0 w-full h-full border-0"
                                title="Certificate Preview"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions Container - Below PDF */}
                <div className="w-full max-w-xl flex flex-col sm:flex-row justify-center gap-4 py-2 mb-4">
                    <a
                        href={successResult.url}
                        download={successResult.filename}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-95 group"
                    >
                        <svg className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download PDF
                    </a>

                    <button
                        onClick={() => {
                            if (successResult) window.URL.revokeObjectURL(successResult.url);
                            setSuccessResult(null);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-semibold transition-all shadow-sm active:scale-95"
                    >
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Generate Another
                    </button>
                </div>

                <button
                    onClick={() => {
                        if (successResult) window.URL.revokeObjectURL(successResult.url);
                        onCancel();
                    }}
                    className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Return to Templates
                </button>
            </div>
        );
    }

    const hasFields = textVariables.length > 0 || imagePlaceholders.length > 0;

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-6 md:p-8 space-y-8 flex-1">

                {!hasFields && (
                    <div className="text-center py-8">
                        <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-slate-500 font-medium text-lg mb-1">No dynamic fields found.</p>
                        <p className="text-slate-400 text-sm">This template does not contain any text variables or image placeholders. You can still generate it to easily export the static design.</p>
                    </div>
                )}

                {/* Text Variables Section */}
                {textVariables.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                            <span className="bg-purple-100 text-purple-700 p-1.5 rounded-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                            </span>
                            <h3 className="font-bold text-slate-800 text-lg">Text Details</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                            {textVariables.map((variable) => (
                                <div key={variable.id} className="flex flex-col gap-1.5">
                                    <label htmlFor={variable.id} className="text-sm font-semibold text-slate-700 capitalize">
                                        {variable.content.replace(/_/g, ' ')}
                                        {/* Optional indicator could go here */}
                                    </label>
                                    <input
                                        id={variable.id}
                                        type="text"
                                        placeholder={`Enter ${variable.content.replace(/_/g, ' ')}`}
                                        value={textValues[variable.content] || ""}
                                        onChange={(e) => handleTextChange(variable.content, e.target.value)}
                                        className="w-full text-base border-2 border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-colors disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
                                        required
                                        disabled={!!editCertificateNumber && variable.content === "certificate_number"}
                                        title={!!editCertificateNumber && variable.content === "certificate_number" ? "Certificate number cannot be changed during editing." : undefined}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Image Placeholders Section */}
                {imagePlaceholders.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                            <span className="bg-amber-100 text-amber-700 p-1.5 rounded-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </span>
                            <h3 className="font-bold text-slate-800 text-lg">Images</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                            {imagePlaceholders.map((placeholder) => {
                                const currentVal: any = imageValues[placeholder.image_url];
                                // Handle both raw strings (new uploads) and objects (from initialData)
                                const isObjectVal = currentVal && typeof currentVal === 'object' && currentVal.url;
                                const valString = isObjectVal ? currentVal.url : currentVal;

                                const isExistingUrl = valString && typeof valString === 'string' && !valString.startsWith("data:");
                                const existingUrl = isExistingUrl ? valString : null;

                                return (
                                    <div key={placeholder.id} className="flex flex-col gap-1.5">
                                        <label htmlFor={placeholder.id} className="text-sm font-semibold text-slate-700 capitalize">
                                            {placeholder.image_url.replace(/_/g, ' ')}
                                        </label>

                                        {existingUrl && (
                                            <div className="flex items-center gap-3 mb-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                                <div className="w-12 h-12 rounded bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-300">
                                                    <img src={existingUrl} alt="Current" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-700 truncate">Existing Image</p>
                                                    <p className="text-xs text-slate-500">Select a new file below to replace it</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="relative">
                                            <input
                                                id={placeholder.id}
                                                type="file"
                                                accept="image/png, image/jpeg, image/jpg"
                                                onChange={(e) => handleImageChange(placeholder.image_url, e.target.files?.[0] || null)}
                                                className="w-full text-sm text-slate-500 border-2 border-slate-200 border-dashed rounded-xl p-2
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-lg file:border-0
                                                file:text-sm file:font-semibold
                                                file:bg-amber-50 file:text-amber-700
                                                hover:file:bg-amber-100 transition-colors cursor-pointer bg-slate-50 hover:bg-slate-100"
                                                required={!existingUrl}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Form Footer */}
            <div className="bg-slate-50 p-6 border-t border-slate-200 flex items-center justify-end gap-3 mt-auto">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isGenerating}
                    className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isGenerating}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-75 disabled:active:scale-100 disabled:cursor-not-allowed"
                >
                    {isGenerating ? (
                        <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>{editCertificateNumber ? "Updating..." : "Generating..."}</span>
                        </>
                    ) : (
                        <span>{editCertificateNumber ? "Update PDF" : "Generate PDF"} &rarr;</span>
                    )}
                </button>
            </div>

            {/* Error Popup Modal */}
            {error && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 shadow-sm border border-red-200">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Generation Failed</h3>
                            <p className="text-slate-600 mb-6 font-medium leading-relaxed">{error}</p>
                            <button
                                type="button"
                                onClick={() => setError(null)}
                                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-all shadow-sm active:scale-95"
                            >
                                Dismiss & Fix
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}
