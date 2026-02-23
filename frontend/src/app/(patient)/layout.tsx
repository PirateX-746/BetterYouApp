"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Home, Calendar, User, MessageSquare, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";

export default function AppLayout({
    children,
}: {
    children: ReactNode;
}) {
    const pathname = usePathname();

    const navItems = [
        { href: "/home", icon: Home, label: "Home" },
        { href: "/appointments", icon: Calendar, label: "Appointments" },
        { href: "/messages", icon: MessageSquare, label: "Messages" },
        { href: "/profile", icon: User, label: "Profile" },
        { href: "/logout", icon: LogOut, label: "Logout" },
    ];

    return (
        <div className="min-h-screen flex bg-muted/40">

            {/* ================= DESKTOP SIDEBAR ================= */}
            <aside className="hidden md:flex w-72 flex-col bg-white border-r p-6">
                <h2 className="text-2xl font-bold mb-10">Cliniq</h2>

                <nav className="space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                            <Link key={item.href} href={item.href}>
                                <div
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${isActive
                                        ? "bg-blue-100 text-blue-600"
                                        : "text-gray-600 hover:bg-gray-100"
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{item.label}</span>
                                </div>
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* ================= MAIN ================= */}
            <div className="flex-1 relative">

                {/* Content Wrapper */}
                <main className="p-6 pb-28 md:pb-6 max-w-7xl mx-auto">
                    {children}
                </main>

                {/* ================= MOBILE FLOATING TAB ================= */}
                <nav className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50">
                    <div className="flex justify-around items-center bg-white/90 backdrop-blur-xl border-t border-gray-200 shadow-2xl h-16">
                        {navItems.slice(0, 4).map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link key={item.href} href={item.href}>
                                    <div
                                        className={`flex flex-col items-center transition ${isActive
                                            ? "text-blue-600"
                                            : "text-gray-400"
                                            }`}
                                    >
                                        <Icon className="w-6 h-6" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            </div>
        </div>
    );
}