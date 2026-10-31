"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Lock, Bell, ChevronRight, X, Users, XCircle, CalendarClock, BellRing } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { usePortalLock } from "@/contexts/PortalLockContext";
import { usePractitionerChat } from "@/contexts/PractitionerChatContext";
import { usePractitionerBreadcrumb } from "@/contexts/PractitionerBreadcrumbContext";
import { PRACTITIONER_NAV_LABELS } from "@/lib/practitionerNav";
import {
  usePractitionerNotifications,
  type CheckInNotification,
} from "@/contexts/PractitionerNotificationsContext";

interface TopbarProps {
  onToggle: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function PractitionerTopbar({ onToggle }: TopbarProps) {
  const pathname = usePathname();
  const { isLocked, lock } = usePortalLock();
  const { chatOpen } = usePractitionerChat();
  const { extraCrumb } = usePractitionerBreadcrumb();
  const { notifications, unreadCount, markAllRead, dismiss, navigateTo } =
    usePractitionerNotifications();

  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const breadcrumbs = useMemo(() => {
    const topLevel = Object.keys(PRACTITIONER_NAV_LABELS).find(
      (route) => pathname === route || pathname.startsWith(route + "/"),
    );
    if (!topLevel) return [];
    const crumbs = [{ label: PRACTITIONER_NAV_LABELS[topLevel], href: topLevel }];
    if (pathname !== topLevel && extraCrumb) {
      crumbs.push({ label: extraCrumb, href: pathname });
    }
    return crumbs;
  }, [pathname, extraCrumb]);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    if (bellOpen) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [bellOpen]);

  const handleBellClick = () => {
    setBellOpen((v) => !v);
    if (!bellOpen && unreadCount > 0) markAllRead();
  };

  return (
    <header
      className={`fixed top-0 right-0 left-0 lg:left-64 z-30 h-topbar pt-safe-t bg-bg-card border-b border-border items-center justify-between px-4 md:px-6 ${
        chatOpen ? "hidden md:flex" : "flex"
      }`}
    >
      {/* Hamburger — mobile only */}
      <button
        onClick={onToggle}
        className="lg:hidden p-2 rounded-lg hover:bg-bg-hover transition text-text-secondary"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>

      {/* The page title lives here, not in the content: a top-level page shows
          its name; a detail page shows the path to it ("Patients › Name"). */}
      {breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="flex-1 lg:flex-none flex items-center gap-1.5 min-w-0 ml-1 lg:ml-0">
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <span key={crumb.href} className={`items-center gap-1.5 min-w-0 ${isLast ? "flex" : "hidden lg:flex"}`}>
                {i > 0 && <ChevronRight size={16} className="hidden lg:block text-text-light shrink-0" aria-hidden />}
                {isLast ? (
                  <span aria-current="page" className="text-title-3 font-semibold text-text-primary truncate max-w-[60vw] lg:max-w-[360px]">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-title-3 font-medium text-text-secondary hover:text-text-primary transition-colors truncate max-w-[200px] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      ) : (
        <div className="hidden lg:block" />
      )}

      {/* Right */}
      <div className="flex items-center gap-1 shrink-0">
        <ThemeToggle />

        {/* Notification bell */}
        <div ref={bellRef} className="relative">
          <button
            onClick={handleBellClick}
            className="relative p-2 rounded-lg hover:bg-bg-hover transition text-text-secondary"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-bg-card border border-border rounded-2xl shadow-lg z-50 overflow-hidden origin-top-right animate-in fade-in-0 zoom-in-[0.97] duration-150 motion-reduce:zoom-in-100">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold text-text-primary">
                  Notifications
                </span>
                {/* Waiting Room is disabled for now.
                <button
                  onClick={() => {
                    router.push("/waiting-room");
                    setBellOpen(false);
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  View Waiting Room
                </button>
                */}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-text-disabled">
                    <Bell size={24} />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  notifications.slice(0, 15).map((n: CheckInNotification) => (
                    <NotificationRow
                      key={n.id}
                      notification={n}
                      onNavigate={() => {
                        navigateTo(n);
                        setBellOpen(false);
                      }}
                      onDismiss={() => dismiss(n.id)}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Lock portal */}
        {!isLocked && (
          <button
            onClick={lock}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-bg-hover transition"
            aria-label="Lock portal"
            title="Lock portal"
          >
            <Lock size={16} />
            <span className="hidden sm:inline">Lock</span>
          </button>
        )}
      </div>
    </header>
  );
}

const KIND_META: Record<string, { icon: typeof Users; iconCls: string; verb: string; action: string }> = {
  check_in:        { icon: Users,         iconCls: "bg-success/10 text-success-strong",  verb: "has arrived",    action: "View in Waiting Room" },
  appt_cancelled:  { icon: XCircle,       iconCls: "bg-danger/10 text-danger-strong",    verb: "cancelled",      action: "View appointments" },
  appt_rescheduled:{ icon: CalendarClock, iconCls: "bg-warning/10 text-warning-strong",  verb: "rescheduled",    action: "View appointments" },
  appt_reminder:   { icon: BellRing,      iconCls: "bg-primary/10 text-primary",  verb: "is coming up",   action: "View appointments" },
};

function NotificationRow({
  notification: n,
  onNavigate,
  onDismiss,
}: {
  notification: CheckInNotification;
  onNavigate: () => void;
  onDismiss: () => void;
}) {
  const apptTime = new Date(n.appointmentStart).toLocaleTimeString([], {
    hour: "numeric", hour12: true,
    minute: "2-digit",
  });
  const meta = KIND_META[n.kind] ?? KIND_META.check_in;
  const Icon = meta.icon;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 hover:bg-bg-hover transition-colors border-b border-border last:border-0 ${
        !n.read ? "bg-primary/[0.03]" : ""
      }`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${meta.iconCls}`}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-primary leading-snug">
          <span className="font-semibold">{n.patientName}</span> {meta.verb}
        </p>
        <p className="text-xs text-text-secondary mt-0.5 truncate">
          {apptTime} · {n.appointmentTitle}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <button
            onClick={onNavigate}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            {meta.action}
          </button>
          <span className="text-[11px] text-text-disabled">
            {timeAgo(n.checkedInAt)}
          </span>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="text-text-disabled hover:text-text-secondary transition shrink-0 mt-0.5"
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  );
}
