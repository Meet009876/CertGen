"use client";

import { useState, useEffect } from "react";
import { TemplateElement } from "@/types/template";
import GenerationForm from "./GenerationForm";
import ExistingCertificatesView from "./ExistingCertificatesView";

interface TemplateMeta {
    id: string;
    name: string;
}

export default function GenerateCertificatePage() {
    const [viewMode, setViewMode] = useState<"landing" | "create" | "view">("landing");
    const [templates, setTemplates] = useState<TemplateMeta[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>(null);
    const [editCertificateNumber, setEditCertificateNumber] = useState<string | null>(null);

    // Fetch template list on mount
    useEffect(() => {
        const fetchTemplates = async () => {
            setIsLoading(true);
            try {
                const res = await fetch("/api/templates");
                if (res.ok) {
                    const data = await res.json();
                    setTemplates(data);
                }
            } catch (err) {
                console.error("Failed to load templates:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTemplates();
    }, []);

    // Filter templates based on search query
    const filteredTemplates = templates.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (viewMode === "view") {
        return (
            <ExistingCertificatesView
                onBack={() => setViewMode("landing")}
                onEdit={(certNum, templateId, data) => {
                    setEditCertificateNumber(certNum);
                    setSelectedTemplateId(templateId);
                    setEditData(data);
                    setViewMode("create");
                }}
            />
        );
    }

    // Render form view
    if (viewMode === "create" && selectedTemplateId) {
        return (
            <div className="flex flex-col h-full bg-slate-50 relative" style={{ height: "calc(100vh - 56px)" }}>
                {/* Header */}
                <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shadow-sm">
                    <button
                        onClick={() => {
                            setSelectedTemplateId(null);
                            if (editCertificateNumber) {
                                setEditData(null);
                                setEditCertificateNumber(null);
                                setViewMode("view");
                            }
                        }}
                        className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                        title={editCertificateNumber ? "Back to search" : "Back to template list"}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">
                            {editCertificateNumber ? "Edit Certificate" : "Fill Details"}
                        </h1>
                        <p className="text-sm text-slate-500">
                            {editCertificateNumber ? `Updating existing certificate ${editCertificateNumber}` : "Provide data to generate the certificate"}
                        </p>
                    </div>
                </div>

                {/* Form Container */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 flex justify-center">
                    <div className="max-w-3xl w-full">
                        <GenerationForm
                            templateId={selectedTemplateId}
                            onCancel={() => {
                                setSelectedTemplateId(null);
                                setEditData(null);
                                setEditCertificateNumber(null);
                                if (editCertificateNumber) {
                                    setViewMode("view");
                                }
                            }}
                            initialData={editData}
                            editCertificateNumber={editCertificateNumber}
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (viewMode === "create" && !selectedTemplateId) {
        return (
            <div className="flex flex-col h-full bg-slate-50 relative overflow-y-auto w-full" style={{ height: "calc(100vh - 56px)" }}>
                <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shadow-sm sticky top-0 z-10">
                    <button
                        onClick={() => setViewMode("landing")}
                        className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                        title="Back to landing page"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Choose Template</h1>
                        <p className="text-sm text-slate-500">Select a template to build your document</p>
                    </div>
                </div>

                <div className="flex justify-center py-12 px-6">
                    <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6 max-w-4xl">
                        <div className="relative">
                            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search templates by name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full text-base border-2 border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors bg-slate-50 focus:bg-white"
                            />
                        </div>

                        <div className="flex flex-col gap-2 min-h-[300px]">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center flex-1 text-slate-400 gap-3">
                                    <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Loading templates...</span>
                                </div>
                            ) : filteredTemplates.length === 0 ? (
                                <div className="flex flex-col items-center justify-center flex-1 text-slate-400">
                                    <svg className="w-12 h-12 opacity-50 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <p className="text-gray-500">No templates found matching your search.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2 overflow-y-auto pr-1">
                                    {filteredTemplates.map((template) => (
                                        <button
                                            key={template.id}
                                            onClick={() => setSelectedTemplateId(template.id)}
                                            className="text-left px-5 py-4 border-2 border-slate-100 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group flex flex-col gap-1 items-start shadow-sm hover:shadow"
                                        >
                                            <div className="flex items-center gap-3 w-full">
                                                <div className="w-10 h-10 rounded-lg bg-blue-100 group-hover:bg-white flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-slate-800 tracking-tight truncate w-full">
                                                        {template.name}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 group-hover:text-blue-600 font-medium transition-colors">
                                                        Select Template &rarr;
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Render landing/selection view
    return (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-y-auto w-full" style={{ height: "calc(100vh - 56px)" }}>
            <div className="flex flex-col items-center gap-8 max-w-4xl w-full px-6 py-12 mx-auto mt-10">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-slate-800">Generate Certificate</h1>
                    <p className="text-slate-500 mt-2 text-base">Select a template to build your document or view existing ones</p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full">
                    <button
                        onClick={() => setViewMode("create")}
                        className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-2xl transition-all shadow-sm group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-slate-800 text-sm">Create New Certificate</p>
                            <p className="text-xs text-slate-400 mt-0.5">Start a new generation</p>
                        </div>
                    </button>
                    <button
                        onClick={() => setViewMode("view")}
                        className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-2xl transition-all shadow-sm group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition-colors">
                            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-slate-800 text-sm">View Existing Certificate</p>
                            <p className="text-xs text-slate-400 mt-0.5">Browse history</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
