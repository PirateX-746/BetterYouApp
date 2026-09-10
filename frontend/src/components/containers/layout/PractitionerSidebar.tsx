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
  MessageCircle,
  ChevronUp,
  User,
  LogOut,
  Pill,
  Clock,
} from "lucide-react";
import { usePractitionerUnread } from "@/contexts/PractitionerUnreadContext";
import { usePractitionerChat } from "@/contexts/PractitionerChatContext";
import { useLogout } from "@/hooks/useLogout";
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

const NAV_ITEMS = [
  { label: "Dashboard",     href: "/dashboard",                icon: LayoutDashboard },
  { label: "Waiting Room",  href: "/waiting-room",             icon: Clock },
  { label: "Appointments",  href: "/appointmentsPractitioner", icon: CalendarCheck },
  { label: "Patients",      href: "/patients",                 icon: Users },
  { label: "Medications",   href: "/medications",              icon: Pill },
  { label: "Messages",      href: "/messages",                 icon: MessageCircle },
  { label: "Settings",      href: "/settings",                 icon: Settings },
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
  const { totalUnread } = usePractitionerUnread();
  const { chatOpen } = usePractitionerChat();
  const { handleLogout, isPending } = useLogout();
  const [doctorName, setDoctorName] = useState("User");
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  useEffect(() => {
    const cookies = document.cookie.split("; ");
    const nameCookie = cookies.find((r) => r.startsWith("name="));
    if (nameCookie) setDoctorName(decodeURIComponent(nameCookie.split("=")[1]));
  }, []);

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
          fixed top-0 left-0 z-40 h-screen w-64
          bg-bg-card border-r border-border
          transform transition-transform duration-300 ease-in-out
          flex flex-col
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Brand */}
        <div className="h-14 px-5 flex items-center gap-2.5 border-b border-border shrink-0">
          <Stethoscope size={18} className="text-primary" />
          <span className="font-semibold text-text-primary">
            <span className="text-primary">Better</span>You
          </span>
        </div>

        {/* Nav — flex-1 so it fills space and pushes profile to bottom */}
        <nav className="p-3 space-y-0.5 flex-1">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);
            const isMessages = href === "/messages";
            const badge = isMessages && totalUnread > 0 ? totalUnread : 0;

            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all
                  ${active
                    ? "bg-primary text-white font-medium shadow-sm"
                    : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  }
                `}
              >
                <Icon size={17} />
                <span className="flex-1">{label}</span>
                {badge > 0 && (
                  <span
                    className={`text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ${
                      active ? "bg-white text-primary" : "bg-primary text-white"
                    }`}
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Doctor profile — pinned to bottom */}
        <div className="border-t border-border p-3 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-bg-hover transition text-left focus:outline-none">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{displayName}</p>
                  <p className="text-xs text-text-secondary">Practitioner</p>
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
                className="text-danger focus:text-danger focus:bg-danger/10"
              >
                <LogOut size={14} />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile bottom nav — hidden when a chat conversation is open */}
      {!chatOpen && <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-bg-card border-t border-border flex items-center justify-around px-2">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          const isMessages = href === "/messages";
          const badge = isMessages && totalUnread > 0 ? totalUnread : 0;

          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="relative flex flex-col items-center gap-1 px-3 py-1"
            >
              <div className="relative">
                <Icon size={22} className={active ? "text-primary" : "text-text-disabled"} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-primary text-white text-[9px] font-bold min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${active ? "text-primary" : "text-text-disabled"}`}>
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
