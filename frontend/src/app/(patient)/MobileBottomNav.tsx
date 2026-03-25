"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PATIENT_NAV_ITEMS } from "@/lib/nav-config";

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-card border-t border-border h-16 flex justify-around items-center z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
    >
      {PATIENT_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;

        return (
          <Link
            key={item.name}
            href={item.href}
            aria-label={item.name}
            aria-current={active ? "page" : undefined}
            className="relative flex flex-col items-center justify-center text-xs"
          >
            <Icon
              size={22}
              className={`transition-colors duration-200 ${
                active ? "text-primary" : "text-text-disabled"
              }`}
            />
            {active && (
              <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full mt-1" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
