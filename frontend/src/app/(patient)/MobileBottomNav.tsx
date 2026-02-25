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
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-card border-t border-border h-16 flex justify-around items-center z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">

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
                            className={`transition-colors duration-200 ${active
                                ? "text-primary"
                                : "text-text-disabled"
                                }`}
                        />

                        {/* Active Indicator */}
                        {active && (
                            <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full mt-1"></div>
                        )}
                    </Link>
                );
            })}
        </div>
    );
}