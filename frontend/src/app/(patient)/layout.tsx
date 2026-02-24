"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Home,
    Calendar,
    MessageCircle,
    User,
    Settings,
    LogOut,
} from "lucide-react";

export default function PatientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        { name: "Home", href: "/patient/home", icon: Home },
        { name: "Appointments", href: "/patient/appointments", icon: Calendar },
        { name: "Messages", href: "/patient/messages", icon: MessageCircle },
        { name: "Profile", href: "/patient/profile", icon: User },
        { name: "Settings", href: "/patient/settings", icon: Settings },
    ];

    const handleLogout = () => {
        document.cookie = "token=; Max-Age=0; path=/";
        document.cookie = "role=; Max-Age=0; path=/";
        document.cookie = "name=; Max-Age=0; path=/";
        document.cookie = "userId=; Max-Age=0; path=/";
        localStorage.clear();
        window.location.href = "/patientLogin";
    };

    return (
        <div className="relative h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">

            {/* Ambient Glow */}
            <div className="absolute top-[-150px] left-[-150px] w-[400px] h-[400px] bg-blue-200 rounded-full blur-3xl opacity-30" />
            <div className="absolute bottom-[-150px] right-[-150px] w-[400px] h-[400px] bg-indigo-300 rounded-full blur-3xl opacity-30" />

            <div className="relative flex h-full">

                {/* ================= Desktop Sidebar (FIXED) ================= */}
                <div className="hidden md:flex w-64 p-6">
                    <div className="backdrop-blur-2xl bg-white/70 border border-blue-100/40 rounded-3xl shadow-[0_25px_60px_rgba(15,23,42,0.12)] p-6 flex flex-col justify-between h-full w-full">

                        <div>
                            <h1 className="text-xl font-semibold text-gray-800 mb-8">
                                Better<span className="text-blue-500">You</span>
                            </h1>

                            <nav className="space-y-3">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    const active = pathname === item.href;

                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${active
                                                ? "bg-blue-500 text-white shadow-md"
                                                : "text-gray-600 hover:bg-blue-50"
                                                }`}
                                        >
                                            <Icon size={18} />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-500 transition-all duration-300"
                        >
                            <LogOut size={18} />
                            Logout
                        </button>
                    </div>
                </div>

                {/* ================= Main Content (SCROLLABLE) ================= */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 pb-24 md:pb-10">
                    {children}
                </div>
            </div>

            {/* ================= Mobile Bottom Navigation ================= */}
            <div className="md:hidden fixed bottom-4 left-4 right-4 backdrop-blur-2xl bg-white/80 border border-blue-100/40 rounded-2xl shadow-lg px-4 py-3 flex justify-between items-center">

                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex flex-col items-center text-xs ${active ? "text-blue-500" : "text-gray-500"
                                }`}
                        >
                            <Icon size={20} />
                        </Link>
                    );
                })}

                <button
                    onClick={handleLogout}
                    className="flex flex-col items-center text-xs text-red-500"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </div>
    );
}