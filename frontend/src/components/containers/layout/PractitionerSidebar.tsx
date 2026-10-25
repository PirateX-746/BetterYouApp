"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Settings,
  Stethoscope,
  ChevronUp,
  User,
  LogOut,
  Pill,
  type LucideIcon,
  LifeBuoy,
  ClipboardList,
} from "lucide-react";
import { usePractitionerChat } from "@/contexts/PractitionerChatContext";
import { useLogout } from "@/hooks/useLogout";
import { readCookie, useClientValue } from "@/hooks/useClientValue";
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

interface SidebarProps {
  open: boolean;
  setOpen: (value: boolean) => void;
}

type NavItem = { label: string; href: string; icon: LucideIcon; comingSoon?: boolean; group: "clinic" | "account" };

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",     href: "/dashboard",                icon: LayoutDashboard, group: "clinic" },
  // { label: "Waiting Room",  href: "/waiting-room",             icon: Clock,           comingSoon: true, group: "clinic" },
  { label: "Appointments",  href: "/appointmentsPractitioner", icon: CalendarCheck,   group: "clinic" },
  { label: "Patients",      href: "/patients",                 icon: Users,           group: "clinic" },
  { label: "Assessments",   href: "/assessments",              icon: ClipboardList,   group: "clinic" },
  { label: "Medications",   href: "/medications",              icon: Pill,            group: "clinic" },
  // { label: "Messages",      href: "/messages",                 icon: MessageCircle,  comingSoon: true, group: "clinic" },
  { label: "Help & Support", href: "/support",                 icon: LifeBuoy,        group: "account" },
  { label: "Settings",      href: "/settings",                 icon: Settings,        group: "account" },
];

const NAV_GROUPS: { id: NavItem["group"]; label: string }[] = [
  { id: "clinic", label: "Clinic" },
  { id: "account", label: "Practice" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function PractitionerSidebar({ open, setOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { chatOpen } = usePractitionerChat();
  const { handleLogout, isPending } = useLogout();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  const doctorName = useClientValue(() => readCookie("name"), null) || "User";

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const initials = getInitials(doctorName);
  const displayName = `Dr. ${doctorName}`;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-[100dvh] w-64 pt-safe-t pb-safe-b
          bg-bg-card border-r border-border
          transform transition-transform duration-300 ease-apple motion-reduce:transition-none
          flex flex-col
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Brand */}
        <div className="h-14 px-5 flex items-center gap-2.5 shrink-0">
          <span className="size-7 rounded-lg bg-brand text-white grid place-items-center shadow-brand">
            <Stethoscope size={15} aria-hidden />
          </span>
          <span className="text-title-3 font-semibold text-text-primary">
            <span className="text-primary">Better</span>You
          </span>
        </div>

        {/* Nav — flex-1 so it fills space and pushes profile to bottom */}
        <nav aria-label="Main" className="px-3 pt-2 pb-3 flex-1 overflow-y-auto space-y-5">
          {NAV_GROUPS.map((g) => (
          <div key={g.id}>
          <p className="px-3 pb-1.5 text-eyebrow font-semibold uppercase text-text-light">{g.label}</p>
          <div className="space-y-0.5">
          {NAV_ITEMS.filter((n) => n.group === g.id).map(({ label, href, icon: Icon, comingSoon }) => {
            if (comingSoon) {
              return (
                <div
                  key={href}
                  aria-disabled="true"
                  title={`${label} — coming soon`}
                  className="flex items-center gap-3 h-9 px-3 rounded-lg text-body text-text-disabled cursor-not-allowed select-none"
                >
                  <Icon size={17} />
                  <span className="flex-1">{label}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-bg-hover text-text-disabled">
                    Soon
                  </span>
                </div>
              );
            }

            const active = isActive(href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`
                  flex items-center gap-3 h-9 px-3 rounded-lg text-body transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
                  ${active
                    ? "bg-primary/10 text-primary-strong font-semibold"
                    : "text-text-secondary font-medium hover:bg-bg-hover hover:text-text-primary"
                  }
                `}
              >
                <Icon size={17} className={active ? "text-primary" : ""} aria-hidden />
                <span className="flex-1">{label}</span>
              </Link>
            );
          })}
          </div>
          </div>
          ))}
        </nav>

        {/* Doctor profile — pinned to bottom */}
        <div className="border-t border-border-light p-3 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {/* suppressHydrationWarning: Radix's useId()-generated id for this
                  trigger legitimately differs between the dev-mode SSR pass and
                  client hydration (Turbopack Fast Refresh artifact — confirmed
                  absent in a production build). The id is only used to wire up
                  aria-controls internally; a mismatch here is inert. */}
              <button
                suppressHydrationWarning
                className="flex items-center gap-3 w-full px-2.5 py-2 rounded-lg hover:bg-bg-hover transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-medium text-text-primary truncate">{displayName}</p>
                  <p className="text-caption text-text-secondary">Practitioner</p>
                </div>
                <ChevronUp size={14} className="text-text-secondary shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-52">
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <User size={14} />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setLogoutDialogOpen(true)}
                className="text-danger-strong focus:text-danger-strong focus:bg-danger/10"
              >
                <LogOut size={14} />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile bottom nav — hidden when a chat conversation is open */}
      {!chatOpen && <nav aria-label="Main" className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-bottomnav pb-safe-b bg-bg-card border-t border-border flex items-center justify-around px-1 overflow-x-auto scrollbar-hide">
        {NAV_ITEMS.map(({ label, href, icon: Icon, comingSoon }) => {
          if (comingSoon) {
            return (
              <div
                key={href}
                aria-disabled="true"
                title={`${label} — coming soon`}
                className="relative flex flex-col items-center gap-1 px-3 py-1 cursor-not-allowed select-none"
              >
                <div className="relative">
                  <Icon size={22} className="text-text-disabled" />
                  <span className="absolute -top-1.5 -right-3 text-[7px] font-bold uppercase px-1 py-0.5 rounded-full bg-bg-hover text-text-disabled">
                    Soon
                  </span>
                </div>
                <span className="text-[10px] font-medium text-text-disabled">{label}</span>
              </div>
            );
          }

          const active = isActive(href);

          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className="relative flex flex-col items-center gap-1 px-2 py-1 shrink-0"
            >
              <Icon size={22} className={active ? "text-primary" : "text-text-secondary"} aria-hidden />
              <span className={`text-[10px] font-medium ${active ? "text-primary-strong" : "text-text-secondary"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>}

      {/* Logout confirm dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out of the portal?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLogoutDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => { setLogoutDialogOpen(false); handleLogout(); }}
              disabled={isPending}
            >
              {isPending ? "Logging out…" : "Logout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
