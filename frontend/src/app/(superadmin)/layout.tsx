"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu } from "lucide-react";
import SuperAdminSidebar from "@/components/containers/superadmin/SuperAdminSidebar";
import ThemeToggle from "@/components/containers/layout/ThemeToggle";
import { SupportLiveToaster } from "@/components/containers/support/SupportLiveToaster";
import { SupportBell } from "@/components/containers/support/SupportInbox";
import { SupportInboxProvider } from "@/contexts/SupportInboxContext";
import { PractitionerBreadcrumbProvider, usePractitionerBreadcrumb } from "@/contexts/PractitionerBreadcrumbContext";

/** Console sections, for the topbar title. Matches SuperAdminSidebar's nav. */
const ADMIN_NAV_LABELS: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/practices": "Practices",
  "/admin/practitioners": "Practitioners",
  "/admin/subscriptions": "Subscriptions",
  "/admin/support": "Support",
  "/admin/audit-logs": "Audit Logs",
  "/admin/settings": "Settings",
};

/**
 * Platform console shell.
 *
 * Same structure as the practitioner portal: fixed sidebar, a topbar that
 * carries the page title as a breadcrumb ("Support › SUP-1006") plus the
 * notification bell, and scrolling content. The breadcrumb provider is the
 * practitioner one — it is what makes PageHeader move its title up here.
 * The console has no practice context, portal lock or chat; its
 * notifications are support tickets.
 */
export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <SupportInboxProvider side="support">
      <PractitionerBreadcrumbProvider>
        <ConsoleShell>{children}</ConsoleShell>
      </PractitionerBreadcrumbProvider>
    </SupportInboxProvider>
  );
}

function ConsoleShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { extraCrumb } = usePractitionerBreadcrumb();

  const crumbs = useMemo(() => {
    const top = Object.keys(ADMIN_NAV_LABELS).find((r) => pathname === r || pathname.startsWith(r + "/"));
    if (!top) return [];
    const list = [{ label: ADMIN_NAV_LABELS[top], href: top }];
    if (pathname !== top && extraCrumb) list.push({ label: extraCrumb, href: pathname });
    return list;
  }, [pathname, extraCrumb]);

  return (
    // theme-mono (globals.css) re-points the color tokens to black/white/grey
    // for everything in the console, so pages need no per-page styling.
    <div className="theme-mono">
      <SupportLiveToaster side="support" />
      <SuperAdminSidebar open={open} setOpen={setOpen} />

      <div className="lg:ml-64 min-h-[100dvh] pb-safe-b bg-bg-page flex flex-col">
        <header className="sticky top-0 z-30 h-topbar pt-safe-t shrink-0 border-b border-border bg-bg-card flex items-center gap-3 px-4 md:px-6">
          <button
            onClick={() => setOpen((o) => !o)}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-bg-hover text-text-secondary"
            aria-label="Toggle navigation"
          >
            <Menu size={18} />
          </button>

          {/* The page title lives here, not in the content. */}
          <nav aria-label="Breadcrumb" className="flex-1 flex items-center gap-1.5 min-w-0">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <span key={c.href} className={`items-center gap-1.5 min-w-0 ${last ? "flex" : "hidden lg:flex"}`}>
                  {i > 0 && <ChevronRight size={16} className="hidden lg:block text-text-light shrink-0" aria-hidden />}
                  {last ? (
                    <span aria-current="page" className="text-title-3 font-semibold text-text-primary truncate max-w-[60vw] lg:max-w-[360px]">
                      {c.label}
                    </span>
                  ) : (
                    <Link href={c.href} className="text-title-3 font-medium text-text-secondary hover:text-text-primary transition-colors truncate">
                      {c.label}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <SupportBell />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 w-full">{children}</main>
      </div>
    </div>
  );
}
