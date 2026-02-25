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
        <div className="w-64 h-screen bg-bg-card border-r border-border p-6 flex flex-col justify-between hidden md:flex">

            <div>
                <h1 className="text-lg font-semibold text-text-primary mb-8 flex items-center gap-2">
                    <span className="text-primary">Better</span>You
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
                                    ? "bg-primary text-white font-medium shadow-sm"
                                    : "text-text-secondary hover:bg-bg-hover"
                                    }`}
                            >
                                <Icon size={18} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <button className="flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:bg-danger/10 hover:text-danger rounded-md transition">
                <LogOut size={18} />
                Logout
            </button>
        </div>
    );
}