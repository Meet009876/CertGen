"use client";

import { useState, useEffect } from "react";

interface TeamMember {
    id: string;
    username: string;
    password: string;
    is_active: boolean;
    isadmin: boolean;
    created_at: string;
    can_view_templates: boolean;
    can_edit_template: boolean;
    can_delete_template: boolean;
    can_view_pdf: boolean;
    can_delete_pdf: boolean;
    can_create_pdf: boolean;
}

import AddUserModal from "@/components/AddUserModal";
import ResetPasswordModal from "@/components/ResetPasswordModal";
import TeamMemberRow from "@/components/TeamMemberRow";

function UnauthorizedModal() {
    const [loggingOut, setLoggingOut] = useState(false);

    const handleGoToLogin = async () => {
        setLoggingOut(true);
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });
        } catch {
            // Even if the request fails, redirect to login
        }
        window.location.href = "/login";
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
                {/* Red header band */}
                <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-5 flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Access Restricted</h2>
                        <p className="text-red-100 text-sm">You don&apos;t have permission to view this page</p>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5">
                    <p className="text-slate-600 text-sm leading-relaxed">
                        This page is only accessible to <strong className="text-slate-800">Administrators</strong>.
                        If you believe you should have access, please contact your system administrator.
                    </p>
                    <div className="mt-5 flex gap-3">
                        <button
                            onClick={handleGoToLogin}
                            disabled={loggingOut}
                            className="flex-1 text-center py-2.5 px-4 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-sm disabled:opacity-60"
                        >
                            {loggingOut ? "Signing out…" : "Go to Login"}
                        </button>
                        <a
                            href="/dashboard"
                            className="flex-1 text-center py-2.5 px-4 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                            Back to Dashboard
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TeamMembersPage() {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [unauthorized, setUnauthorized] = useState(false);

    // Modal state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/teamMembers", {
                credentials: "include"
            });
            if (res.status === 403 || res.status === 401) {
                setUnauthorized(true);
                setLoading(false);
                return;
            }
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Failed to fetch team members");
            }
            const data: TeamMember[] = await res.json();
            // Sort by created_at ascending so order never changes on updates/deletes
            data.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            setMembers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    if (unauthorized) return <UnauthorizedModal />;

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-12 min-h-[50vh]">
            <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
                <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin" />
            </div>
            <p className="mt-4 text-slate-500 font-medium text-sm">Loading team members…</p>
        </div>
    );

    if (error) return (
        <div className="p-8 mt-6 max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <div>
                <h3 className="text-base font-semibold text-red-800">Error loading data</h3>
                <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>
        </div>
    );

    return (
        <>
            <div className="max-w-5xl mx-auto w-full">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Team Directory</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Manage user accounts, passwords, and role-based permissions.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add New User
                    </button>
                </div>

                {/* Column Headers */}
                <div className="tm-table-header">
                    <div className="tm-th-member">Member</div>
                    <div className="tm-th">Password</div>
                    <div className="tm-th">Role</div>
                    <div className="tm-th-actions">Manage</div>
                </div>

                {/* User Cards */}
                <div className="space-y-3">
                    {members.map((member) => (
                        <TeamMemberRow
                            key={member.id}
                            member={member}
                            onResetPassword={(m) => {
                                setSelectedUser(m);
                                setIsResetModalOpen(true);
                            }}
                            onRightsUpdated={fetchMembers}
                            onDeleted={fetchMembers}
                        />
                    ))}

                    {members.length === 0 && (
                        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <p className="text-slate-500 font-medium">No team members found.</p>
                                <p className="text-slate-400 text-sm">Add a team member to get started.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <AddUserModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchMembers}
            />

            <ResetPasswordModal
                isOpen={isResetModalOpen}
                onClose={() => {
                    setIsResetModalOpen(false);
                    setSelectedUser(null);
                }}
                onSuccess={fetchMembers}
                user={selectedUser}
            />
        </>
    );
}
