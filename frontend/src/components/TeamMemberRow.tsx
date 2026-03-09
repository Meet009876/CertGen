"use client";

import { useState } from "react";

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

interface TeamMemberRowProps {
    member: TeamMember;
    onResetPassword: (member: TeamMember) => void;
    onRightsUpdated: () => void;
    onDeleted: () => void;
}

export default function TeamMemberRow({ member, onResetPassword, onRightsUpdated, onDeleted }: TeamMemberRowProps) {
    const [rights, setRights] = useState({
        isadmin: member.isadmin,
        can_view_templates: member.can_view_templates,
        can_edit_template: member.can_edit_template,
        can_delete_template: member.can_delete_template,
        can_view_pdf: member.can_view_pdf,
        can_delete_pdf: member.can_delete_pdf,
        can_create_pdf: member.can_create_pdf,
    });
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const hasChanges =
        rights.isadmin !== member.isadmin ||
        rights.can_view_templates !== member.can_view_templates ||
        rights.can_edit_template !== member.can_edit_template ||
        rights.can_delete_template !== member.can_delete_template ||
        rights.can_view_pdf !== member.can_view_pdf ||
        rights.can_delete_pdf !== member.can_delete_pdf ||
        rights.can_create_pdf !== member.can_create_pdf;

    const handleCheckboxChange = (field: keyof typeof rights) => {
        setRights(prev => ({ ...prev, [field]: !prev[field] }));
        setSuccess(false);
        setError("");
    };

    const handleUpdateRights = async () => {
        setUpdating(true);
        setError("");
        setSuccess(false);

        try {
            const res = await fetch(`/api/teamMembers/${member.id}/rights`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(rights),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Failed to update rights");
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            onRightsUpdated();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        setDeleteError("");
        try {
            const res = await fetch(`/api/teamMembers/${member.id}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Failed to delete user");
            }
            onDeleted();
        } catch (err: any) {
            setDeleteError(err.message);
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    // Avatar color based on username initial
    const avatarColors = [
        "from-violet-400 to-purple-600",
        "from-blue-400 to-blue-600",
        "from-emerald-400 to-teal-600",
        "from-orange-400 to-rose-500",
        "from-pink-400 to-fuchsia-600",
    ];
    const colorIdx = member.username.charCodeAt(0) % avatarColors.length;
    const avatarGradient = avatarColors[colorIdx];

    const CheckboxItem = ({ field, label }: { field: keyof typeof rights; label: string }) => (
        <label className="inline-flex items-center gap-2 cursor-pointer group select-none">
            <span className="relative flex items-center justify-center">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={rights[field] as boolean}
                    onChange={() => handleCheckboxChange(field)}
                />
                <span className="w-[18px] h-[18px] rounded-[4px] border-2 border-slate-300 peer-checked:bg-slate-800 peer-checked:border-slate-800 transition-all duration-150 flex items-center justify-center group-hover:border-slate-400">
                    <svg
                        className={`w-3 h-3 text-white transition-transform duration-150 ${(rights[field] as boolean) ? "scale-100" : "scale-0"}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="3"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </span>
            </span>
            <span className={`text-[13px] font-medium transition-colors ${(rights[field] as boolean) ? "text-slate-800" : "text-slate-400"}`}>
                {label}
            </span>
        </label>
    );

    return (
        <div className="tm-user-card">
            {/* ── Main User Row ── */}
            <div className="tm-main-row">
                {/* Avatar + Name */}
                <div className="tm-cell-member">
                    <div className={`tm-avatar bg-gradient-to-br ${avatarGradient}`}>
                        {member.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="tm-username">{member.username}</div>
                        <div className="tm-user-id">ID: {member.id.substring(0, 8)}…</div>
                    </div>
                </div>

                {/* Password */}
                <div className="tm-cell">
                    <div className="tm-password-pill">
                        <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        <span className="tm-password-text">
                            {showPassword ? member.password : "•".repeat(Math.min(member.password.length, 10))}
                        </span>
                        <button
                            onClick={() => setShowPassword(v => !v)}
                            className="tm-eye-btn"
                            title={showPassword ? "Hide password" : "Show password"}
                            type="button"
                        >
                            {showPassword ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Role Badge */}
                <div className="tm-cell">
                    <span className={`tm-role-badge ${member.isadmin ? "tm-role-admin" : "tm-role-user"}`}>
                        {member.isadmin ? (
                            <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" /></svg> Administrator</>
                        ) : (
                            <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg> Standard User</>
                        )}
                    </span>
                </div>

                {/* Action Buttons */}
                <div className="tm-cell-actions">
                    {deleteError && (
                        <span className="text-xs text-red-500 font-medium">{deleteError}</span>
                    )}

                    {confirmDelete ? (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                            <span className="text-xs font-medium text-red-700 whitespace-nowrap">Delete {member.username}?</span>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded-md transition-colors disabled:opacity-60"
                            >
                                {deleting ? "Deleting…" : "Yes, delete"}
                            </button>
                            <button
                                onClick={() => { setConfirmDelete(false); setDeleteError(""); }}
                                className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded-md transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <>
                            <button
                                className="tm-btn-password"
                                onClick={() => onResetPassword(member)}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                                Update Password
                            </button>
                            {!member.isadmin && (
                                <button
                                    className="tm-btn-delete"
                                    onClick={() => setConfirmDelete(true)}
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── Permissions Row ── */}
            <div className={`tm-permissions-row ${member.isadmin ? "tm-permissions-admin" : "tm-permissions-user"}`}>
                {/* Left accent label */}
                <div className="tm-perm-label">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>{member.username}&apos;s permissions</span>
                </div>

                {/* Checkboxes / Admin note */}
                <div className="tm-perm-checkboxes">
                    {member.isadmin ? (
                        <span className="tm-perm-admin-note">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Has all system permissions
                        </span>
                    ) : (
                        <>
                            <CheckboxItem field="can_view_templates" label="View Templates" />
                            <CheckboxItem field="can_edit_template" label="Edit Templates" />
                            <CheckboxItem field="can_delete_template" label="Delete Templates" />
                            <div className="tm-perm-divider" />
                            <CheckboxItem field="can_view_pdf" label="View PDF" />
                            <CheckboxItem field="can_create_pdf" label="Create PDF" />
                            <CheckboxItem field="can_delete_pdf" label="Delete PDF" />
                        </>
                    )}
                </div>

                {/* Save button area */}
                {!member.isadmin && (
                    <div className="tm-perm-actions">
                        {error && <span className="text-xs text-red-500 font-medium truncate max-w-[140px]">{error}</span>}
                        {success && (
                            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Saved!
                            </span>
                        )}
                        <button
                            onClick={handleUpdateRights}
                            disabled={!hasChanges || updating}
                            className={`tm-btn-update-rights ${hasChanges ? "tm-btn-rights-active" : "tm-btn-rights-disabled"}`}
                        >
                            {updating ? (
                                <><svg className="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> Saving…</>
                            ) : (
                                "Update Rights"
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
