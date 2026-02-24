"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Home,
    Calendar,
    MessageCircle,
    User,
    Settings,
} from "lucide-react";

export default function MobileBottomNav() {
    const pathname = usePathname();

    const navItems = [
        { href: "/patient/home", icon: Home },
        { href: "/patient/appointments", icon: Calendar },
        { href: "/patient/messages", icon: MessageCircle },
        { href: "/patient/profile", icon: User },
        { href: "/patient/settings", icon: Settings },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-16 flex justify-around items-center z-50">

            {navItems.map((item, index) => {
                const Icon = item.icon;
                const active = pathname === item.href;

                return (
                    <Link
                        key={index}
                        href={item.href}
                        className="flex flex-col items-center justify-center text-xs"
                    >
                        <Icon
                            size={22}
                            className={`transition ${active
                                    ? "text-[#2563EB]"
                                    : "text-gray-400"
                                }`}
                        />

                        {/* Active Indicator */}
                        {active && (
                            <div className="w-1 h-1 bg-[#2563EB] rounded-full mt-1"></div>
                        )}
                    </Link>
                );
            })}
        </div>
    );
}