import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import SidebarNav from '@/components/SidebarNav';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://127.0.0.1:8000';

async function getUserProfile(sessionToken: string) {
    try {
        const res = await fetch(`${INTERNAL_API_URL}/api/auth/me`, {
            headers: {
                Cookie: `session_id=${sessionToken}; Session_id=${sessionToken}`,
            },
            cache: 'no-store'
        });

        if (!res.ok) return null;
        return await res.json();
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_id')?.value || cookieStore.get('Session_id')?.value;

    if (!sessionToken) {
        redirect('/login');
    }

    const userProfile = await getUserProfile(sessionToken);
    const isAdmin = userProfile?.isadmin === true;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* ── Top Navbar ── */}
            <nav className="bg-white border-b border-slate-200 z-20 flex-shrink-0">
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                        {/* Brand */}
                        <Link href="/dashboard" className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l-5.5 8.5 5.5 11.5 5.5-11.5L12 2zM6.5 10.5h11" />
                                </svg>
                            </div>
                            <span className="text-sm font-bold text-slate-800 tracking-tight">DiamondCert Laboratory</span>
                        </Link>

                        {/* Right side */}
                        <div className="flex items-center gap-3">
                            {userProfile && (
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                        {userProfile.username.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 hidden sm:block">
                                        {userProfile.username}
                                        {isAdmin && (
                                            <span className="ml-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">Admin</span>
                                        )}
                                    </span>
                                </div>
                            )}
                            <LogoutButton />
                        </div>
                    </div>
                </div>
            </nav>

            {/* ── Body ── */}
            <div className="flex flex-1 overflow-hidden">
                {/* Collapsible Sidebar (client component) */}
                <SidebarNav isAdmin={isAdmin} />

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-5 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
