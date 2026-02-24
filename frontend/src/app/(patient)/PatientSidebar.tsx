"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Home,
    Calendar,
    MessageCircle,
    User,
    Settings,
    LogOut,
} from "lucide-react";

export default function PatientSidebar() {
    const pathname = usePathname();

    const navItems = [
        { name: "Home", href: "/patient/home", icon: Home },
        { name: "Appointments", href: "/patient/appointments", icon: Calendar },
        { name: "Messages", href: "/patient/messages", icon: MessageCircle },
        { name: "Profile", href: "/patient/profile", icon: User },
        { name: "Settings", href: "/patient/settings", icon: Settings },
    ];

    return (
        <div className="w-64 h-screen bg-white border-r border-gray-200 p-6 flex flex-col justify-between">

            <div>
                <h1 className="text-lg font-semibold text-[#111827] mb-8">
                    Better<span className="text-[#2563EB]">You</span>
                </h1>

                <nav className="space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = pathname === item.href;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition ${active
                                        ? "bg-[#EFF6FF] text-[#2563EB] font-medium"
                                        : "text-gray-600 hover:bg-gray-100"
                                    }`}
                            >
                                <Icon size={18} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <button className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-md transition">
                <LogOut size={18} />
                Logout
            </button>
        </div>
    );
}