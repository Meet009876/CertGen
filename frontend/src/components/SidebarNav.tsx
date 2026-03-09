"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarNavProps {
    isAdmin: boolean;
}

export default function SidebarNav({ isAdmin }: SidebarNavProps) {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();

    // Persist sidebar state in localStorage
    useEffect(() => {
        const saved = localStorage.getItem("sidebar_collapsed");
        if (saved !== null) setCollapsed(saved === "true");
    }, []);

    const toggle = () => {
        setCollapsed(prev => {
            localStorage.setItem("sidebar_collapsed", String(!prev));
            return !prev;
        });
    };

    // Items visible to ALL authenticated users
    const commonNavItems = [
        {
            href: "/dashboard/templateDesign",
            label: "Template Design",
            icon: (
                <svg className="w-5 h-5 flex-shrink-0" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
            ),
        },
        {
            href: "/dashboard/generateCertificate",
            label: "Generate Certificate",
            icon: (
                <svg className="w-5 h-5 flex-shrink-0" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
            ),
        },
    ];

    // Admin-only items
    const adminNavItems = isAdmin ? [
        {
            href: "/dashboard/teamMembers",
            label: "Team Members",
            icon: (
                <svg className="w-5 h-5 flex-shrink-0" aria-hidden="true" fill="currentColor" viewBox="0 0 20 18">
                    <path d="M14 2a3.963 3.963 0 0 0-1.4.267 6.439 6.439 0 0 1-1.331 6.638A4 4 0 1 0 14 2Zm1 9h-1.264A6.957 6.957 0 0 1 15 15v2a2.97 2.97 0 0 1-.184 1H19a1 1 0 0 0 1-1v-1a5.006 5.006 0 0 0-5-5ZM6.5 9a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM8 10H5a5.006 5.006 0 0 0-5 5v2a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-2a5.006 5.006 0 0 0-5-5Z" />
                </svg>
            ),
        },
    ] : [];

    const navItems = [...commonNavItems, ...adminNavItems];

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

    return (
        <aside
            className="bg-white border-r border-slate-200 flex-shrink-0 flex flex-col transition-[width] duration-300 ease-in-out overflow-hidden"
            style={{ width: collapsed ? "64px" : "240px" }}
        >
            {/* Toggle Button */}
            <div className={`flex ${collapsed ? "justify-center" : "justify-end"} pt-4 pb-2 px-3`}>
                <button
                    onClick={toggle}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 px-2 py-2">
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <li key={item.href}>
                                <a
                                    href={item.href}
                                    onClick={(e) => {
                                        // Allow normal link behavior for modified clicks
                                        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;

                                        // Fire a custom event to check if navigation should be intercepted
                                        const event = new CustomEvent('app-navigate', {
                                            detail: { href: item.href },
                                            cancelable: true
                                        });

                                        if (!window.dispatchEvent(event)) {
                                            e.preventDefault(); // Intercepted
                                        }
                                        // If not intercepted, default behavior occurs
                                    }}
                                    title={collapsed ? item.label : undefined}
                                    className={`flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                                        ${active
                                            ? "bg-blue-50 text-blue-700"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        }
                                        ${collapsed ? "justify-center" : ""}
                                    `}
                                >
                                    <span className={active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}>
                                        {item.icon}
                                    </span>
                                    {!collapsed && (
                                        <span className="truncate whitespace-nowrap">{item.label}</span>
                                    )}
                                    {!collapsed && active && (
                                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    )}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Bottom section – collapsed indicator */}
            {collapsed && (
                <div className="pb-4 flex justify-center">
                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                </div>
            )}
        </aside>
    );
}
