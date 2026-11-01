"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LifeBuoy } from "lucide-react";
import type { SupportTicket } from "@/lib/support";
import { describeSupportEvent, useSupportInbox } from "@/contexts/SupportInboxContext";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

/** One support entry in a notifications list. Clicking opens the ticket (and marks it read). */
export function SupportInboxRow({ ticket: t, onOpen }: { ticket: SupportTicket; onOpen?: () => void }) {
  const router = useRouter();
  const { side } = useSupportInbox();
  const href = side === "support" ? `/admin/support/${t._id}` : `/support/${t._id}`;
  return (
    <button
      type="button"
      onClick={() => {
        onOpen?.();
        router.push(href);
      }}
      className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-bg-hover transition-colors border-b border-border last:border-0 bg-primary/[0.03]"
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-primary/10 text-primary">
        <LifeBuoy size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-primary leading-snug">{describeSupportEvent(t, side)}</p>
        <p className="text-xs text-text-secondary mt-0.5 truncate">
          {t.ticketNo} · {t.subject}
        </p>
        <p className="text-[11px] text-text-disabled mt-1">{timeAgo(t.lastEventAt ?? t.lastMessageAt)}</p>
      </div>
    </button>
  );
}

/** Count badge for a nav item. Renders nothing at zero. */
export function SupportNavBadge({ className = "" }: { className?: string }) {
  const { tickets } = useSupportInbox();
  if (!tickets.length) return null;
  return (
    <span
      className={`min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center ${className}`}
      aria-label={`${tickets.length} support updates`}
    >
      {tickets.length > 9 ? "9+" : tickets.length}
    </span>
  );
}

/** Bell for the platform console, which has no other notifications. */
export function SupportBell() {
  const { tickets } = useSupportInbox();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-bg-hover transition text-text-secondary"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {tickets.length > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {tickets.length > 9 ? "9+" : tickets.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-bg-card border border-border rounded-2xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border text-sm font-semibold text-text-primary">Notifications</div>
          <div className="max-h-80 overflow-y-auto">
            {tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-text-disabled">
                <Bell size={24} />
                <p className="text-sm">You&apos;re all caught up</p>
              </div>
            ) : (
              tickets.map((t) => <SupportInboxRow key={t._id} ticket={t} onOpen={() => setOpen(false)} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
