"use client";

import { useState } from "react";

// Using standard React Portals/div overlays instead of adding Headless UI since it might not be in package.json
interface AddUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    // Rights state
    const [isadmin, setIsadmin] = useState(false);
    const [can_view_templates, setCanViewTemplates] = useState(false);
    const [can_edit_template, setCanEditTemplate] = useState(false);
    const [can_delete_template, setCanDeleteTemplate] = useState(false);
    const [can_view_pdf, setCanViewPdf] = useState(true);
    const [can_create_pdf, setCanCreatePdf] = useState(false);
    const [can_delete_pdf, setCanDeletePdf] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/teamMembers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    password,
                    isadmin,
                    can_view_templates,
                    can_edit_template,
                    can_delete_template,
                    can_view_pdf,
                    can_create_pdf,
                    can_delete_pdf,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Failed to create user");
            }

            onSuccess();
            onClose();

            // Reset form
            setUsername("");
            setPassword("");
            setIsadmin(false);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 font-semibold text-lg dark:text-white">
                    Add New Team Member
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[70vh]">
                    {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                            <input
                                type="text" // Plain text input as per requirements
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Role & Permissions</label>

                            <div className="flex items-center mb-4">
                                <input
                                    id="admin-checkbox"
                                    type="checkbox"
                                    checked={isadmin}
                                    onChange={(e) => setIsadmin(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                />
                                <label htmlFor="admin-checkbox" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                                    Administrator <span className="text-gray-500 font-normal">(Has all permissions)</span>
                                </label>
                            </div>

                            {!isadmin && (
                                <div className="ml-6 space-y-2">
                                    <div className="flex items-center">
                                        <input type="checkbox" checked={can_view_templates} onChange={(e) => setCanViewTemplates(e.target.checked)} id="view-tpl" className="w-4 h-4 rounded text-blue-600" />
                                        <label htmlFor="view-tpl" className="ml-2 text-sm text-gray-700 dark:text-gray-300">View Templates</label>
                                    </div>
                                    <div className="flex items-center">
                                        <input type="checkbox" checked={can_edit_template} onChange={(e) => setCanEditTemplate(e.target.checked)} id="edit-tpl" className="w-4 h-4 rounded text-blue-600" />
                                        <label htmlFor="edit-tpl" className="ml-2 text-sm text-gray-700 dark:text-gray-300">Edit Templates</label>
                                    </div>
                                    <div className="flex items-center">
                                        <input type="checkbox" checked={can_delete_template} onChange={(e) => setCanDeleteTemplate(e.target.checked)} id="del-tpl" className="w-4 h-4 rounded text-blue-600" />
                                        <label htmlFor="del-tpl" className="ml-2 text-sm text-gray-700 dark:text-gray-300">Delete Templates</label>
                                    </div>
                                    <div className="flex items-center">
                                        <input type="checkbox" checked={can_view_pdf} onChange={(e) => setCanViewPdf(e.target.checked)} id="view-pdf" className="w-4 h-4 rounded text-blue-600" />
                                        <label htmlFor="view-pdf" className="ml-2 text-sm text-gray-700 dark:text-gray-300">View PDFs (Default on)</label>
                                    </div>
                                    <div className="flex items-center">
                                        <input type="checkbox" checked={can_create_pdf} onChange={(e) => setCanCreatePdf(e.target.checked)} id="cre-pdf" className="w-4 h-4 rounded text-blue-600" />
                                        <label htmlFor="cre-pdf" className="ml-2 text-sm text-gray-700 dark:text-gray-300">Create PDFs</label>
                                    </div>
                                    <div className="flex items-center">
                                        <input type="checkbox" checked={can_delete_pdf} onChange={(e) => setCanDeletePdf(e.target.checked)} id="del-pdf" className="w-4 h-4 rounded text-blue-600" />
                                        <label htmlFor="del-pdf" className="ml-2 text-sm text-gray-700 dark:text-gray-300">Delete PDFs</label>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {loading ? "Creating..." : "Create User"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
