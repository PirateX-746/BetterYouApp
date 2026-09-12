"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Menu, ShieldCheck } from "lucide-react";
import SuperAdminSidebar from "@/components/containers/superadmin/SuperAdminSidebar";
import ThemeToggle from "@/components/containers/layout/ThemeToggle";

/**
 * Platform console shell.
 *
 * Mirrors the practitioner layout's structure (fixed sidebar, 14px topbar,
 * scrolling main) so the console reads as part of BetterYou, but is a
 * separate route group: the platform console has no practice context, no
 * portal lock, and no chat or notification providers.
 */
export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SuperAdminSidebar open={open} setOpen={setOpen} />

      <div className="lg:ml-64 min-h-screen bg-bg-page flex flex-col">
        <header className="h-14 shrink-0 border-b border-border bg-bg-card flex items-center gap-3 px-4">
          <button
            onClick={() => setOpen((o) => !o)}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-bg-hover text-text-secondary"
            aria-label="Toggle navigation"
          >
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-2 lg:hidden">
            <ShieldCheck size={16} className="text-purple" />
            <span className="text-sm font-semibold text-text-primary">
              Platform
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 w-full max-w-[1400px]">
          {children}
        </main>
      </div>
    </>
  );
}
