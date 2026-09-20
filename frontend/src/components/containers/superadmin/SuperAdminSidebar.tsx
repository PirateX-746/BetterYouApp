"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSessionStorage } from "@/lib/session";
import {
  LayoutDashboard,
  Building2,
  Stethoscope,
  CreditCard,
  ScrollText,
  Settings,
  ShieldCheck,
  ChevronUp,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { platformLogout } from "@/lib/superadmin/api";

interface SidebarProps {
  open: boolean;
  setOpen: (value: boolean) => void;
}

const NAV_ITEMS = [
  { label: "Dashboard",     href: "/admin/dashboard",     icon: LayoutDashboard },
  { label: "Practices",     href: "/admin/practices",     icon: Building2 },
  { label: "Practitioners", href: "/admin/practitioners", icon: Stethoscope },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
  { label: "Audit Logs",    href: "/admin/audit-logs",    icon: ScrollText },
  { label: "Settings",      href: "/admin/settings",      icon: Settings },
];

export default function SuperAdminSidebar({ open, setOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [adminName, setAdminName] = useState("Platform Admin");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("name");
      if (stored) setAdminName(stored);
    } catch {
      /* storage unavailable */
    }
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await platformLogout();
    } catch {
      /* clearing the cookie is best-effort; still leave the console */
    }
    try {
      clearSessionStorage();
    } catch {
      /* storage unavailable */
    }
    window.location.href = "/adminLogin";
  }

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-64
          bg-bg-card border-r border-border
          transform transition-transform duration-300 ease-in-out
          flex flex-col
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Brand — the shield and "Platform" label are what separate this
            from the practitioner portal at a glance. */}
        <div className="h-14 px-5 flex items-center gap-2.5 border-b border-border shrink-0">
          <ShieldCheck size={18} className="text-purple" />
          <span className="font-semibold text-text-primary">
            <span className="text-primary">Better</span>You
          </span>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-purple bg-purple-light px-2 py-0.5 rounded-md">
            Platform
          </span>
        </div>

        <nav className="p-3 space-y-0.5 flex-1">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all
                  ${active
                    ? "bg-purple text-white font-medium shadow-sm"
                    : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  }
                `}
              >
                <Icon size={17} />
                <span className="flex-1">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-bg-hover transition text-left focus:outline-none">
                <div className="w-8 h-8 rounded-full bg-purple flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  PA
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {adminName}
                  </p>
                  <p className="text-xs text-text-secondary">Super Admin</p>
                </div>
                <ChevronUp size={14} className="text-text-secondary shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-52">
              <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
                <Settings size={14} />
                Platform Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setLogoutDialogOpen(true)}
                className="text-danger focus:text-danger focus:bg-danger-light"
              >
                <LogOut size={14} />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out of the platform console?</DialogTitle>
            <DialogDescription>
              You will need to sign in again to manage practices.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLogoutDialogOpen(false)}
              disabled={signingOut}
            >
              Cancel
            </Button>
            <Button onClick={handleSignOut} disabled={signingOut}>
              Sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
