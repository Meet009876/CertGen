"use client";

import { useState, useEffect } from "react";

interface CertificateMeta {
    certificate_number: string;
    created_at?: string;
    url?: string;
}

interface ExistingCertificatesViewProps {
    onBack: () => void;
    onEdit?: (certificateNumber: string, templateId: string, initialData: any) => void;
}

export default function ExistingCertificatesView({ onBack, onEdit }: ExistingCertificatesViewProps) {
    const [viewingIdentifier, setViewingIdentifier] = useState<string | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isLoadingPdf, setIsLoadingPdf] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchError, setSearchError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleSearch = async () => {
        const query = searchQuery.trim();
        if (!query) return;

        setSearchError(null);
        setIsLoadingPdf(true);
        try {
            const res = await fetch(`/api/pdf/stored/${query}`);
            if (res.ok) {
                const data = await res.json();
                setPdfUrl(data.url || data);
                setViewingIdentifier(query);
            } else if (res.status === 404) {
                setSearchError(`Certificate "${query}" not found.`);
            } else {
                setSearchError("Failed to fetch certificate. Please try again.");
            }
        } catch (err) {
            console.error("Failed to search certificate:", err);
            setSearchError("An unexpected error occurred.");
        } finally {
            setIsLoadingPdf(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    const handleDownload = () => {
        if (pdfUrl) {
            const a = document.createElement("a");
            a.href = pdfUrl;
            a.download = `certificate_${viewingIdentifier}.pdf`;
            a.click();
        }
    };

    const handleDelete = async () => {
        if (!viewingIdentifier) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/pdf/stored/${viewingIdentifier}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete certificate");

            setViewingIdentifier(null);
            setPdfUrl(null);
            setShowDeleteModal(false);
        } catch (err: any) {
            console.error("Delete error:", err);
            alert("Failed to delete certificate.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = async () => {
        if (!viewingIdentifier) return;
        setIsEditing(true);
        try {
            const res = await fetch(`/api/pdf/edit/${viewingIdentifier}`);
            if (!res.ok) throw new Error("Failed to fetch certificate data for editing");
            const data = await res.json();
            if (onEdit) {
                onEdit(viewingIdentifier, data.template_id, data);
            }
        } catch (err) {
            console.error("Edit fetch error:", err);
            alert("Failed to load certificate data for editing.");
        } finally {
            setIsEditing(false);
        }
    };

    // Document Viewer Map
    if (viewingIdentifier) {
        return (
            <div className="flex flex-col h-full bg-slate-50 relative overflow-y-auto w-full" style={{ height: "calc(100vh - 56px)" }}>
                {/* Viewer Top Bar */}
                <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => { setViewingIdentifier(null); setPdfUrl(null); }}
                            className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                            title="Back to list"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <div className="flex items-center gap-2">
                            <span className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg block p-2.5 px-4 font-semibold">
                                {viewingIdentifier}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleEdit}
                            disabled={isEditing || isLoadingPdf}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 shadow-sm hover:bg-blue-100 rounded-lg transition-colors border border-blue-100 disabled:opacity-50"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            {isEditing ? "Loading..." : "Edit"}
                        </button>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 shadow-sm hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Delete
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={!pdfUrl || isLoadingPdf}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-emerald-600 shadow-sm hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                        </button>
                    </div>
                </div>

                {/* PDF Canvas */}
                <div className="flex-1 overflow-hidden flex justify-center bg-slate-200 p-4">
                    {isLoadingPdf ? (
                        <div className="flex flex-col items-center justify-center flex-1 text-slate-400 gap-3">
                            <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Loading PDF...</span>
                        </div>
                    ) : pdfUrl ? (
                        <iframe src={`${pdfUrl}#view=FitH&toolbar=0&navpanes=0&scrollbar=0`} className="w-full h-full max-w-5xl rounded-lg shadow-lg border-0 bg-white" title="Certificate PDF" />
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-500">
                            Click "View Certificate" to load the document.
                        </div>
                    )}
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                            <div className="px-6 py-4 border-b border-red-100/50 bg-red-50/30">
                                <h3 className="text-lg font-bold text-red-700">Delete Certificate</h3>
                            </div>
                            <div className="p-6">
                                <p className="text-slate-600 mb-8 font-medium leading-relaxed">
                                    Are you sure you want to delete <span className="font-bold text-slate-800">“{viewingIdentifier}”</span>?
                                </p>
                                <div className="flex items-center justify-end gap-3 bg-slate-50/50 -mx-6 -mb-6 px-6 py-4 rounded-b-2xl border-t border-slate-50">
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        disabled={isDeleting}
                                        className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                    >
                                        {isDeleting ? "Deleting..." : "Delete"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // List View
    return (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-y-auto w-full" style={{ height: "calc(100vh - 56px)" }}>
            <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shadow-sm">
                <button
                    onClick={onBack}
                    className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                    title="Back to landing page"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Existing Certificates</h1>
                    <p className="text-sm text-slate-500">Double click a certificate to view</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-8 px-6 flex justify-center">
                <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col items-center gap-6 mt-12">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-200 mb-2">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <div className="text-center w-full">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Find a Certificate</h2>
                        <p className="text-slate-500">Enter the exact certificate number below to view the document.</p>
                    </div>

                    <div className="w-full flex flex-col sm:flex-row gap-3 mt-4">
                        <div className="relative flex-1">
                            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="e.g. CERT-2023-001"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full text-base border-2 border-slate-200 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors bg-slate-50 focus:bg-white"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={!searchQuery.trim() || isLoadingPdf}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 font-bold text-white bg-emerald-600 shadow-sm hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50 sm:w-auto w-full"
                        >
                            {isLoadingPdf ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                "View Certificate"
                            )}
                        </button>
                    </div>
                    {searchError && (
                        <div className="w-full mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="bg-red-50/50 backdrop-blur-sm border border-red-200/60 rounded-xl p-4 flex items-start gap-3 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-red-400/80 rounded-l-xl"></div>
                                <div className="w-8 h-8 rounded-full bg-red-100/80 flex items-center justify-center flex-shrink-0 text-red-500 mt-0.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div className="flex flex-col">
                                    <h4 className="text-sm font-bold text-red-800 tracking-tight">Search Failed</h4>
                                    <p className="text-sm text-red-600/90 mt-0.5 leading-relaxed">{searchError}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
