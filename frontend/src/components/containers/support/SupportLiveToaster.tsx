"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useSupportLive } from "@/hooks/useSupportLive";

/**
 * Portal-wide toast when the other side updates a ticket. Mounted once per
 * portal layout. Silent when you're already looking at that ticket — the
 * page itself refreshes — and for your own actions.
 */
export function SupportLiveToaster({ side }: { side: "requester" | "support" }) {
  const pathname = usePathname();
  const router = useRouter();
  const base = side === "support" ? "/admin/support" : "/support";

  // Ask once so updates can reach you while the tab is in the background.
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useSupportLive((e) => {
    if (e.by === side) return;
    if (pathname === `${base}/${e.ticketId}`) return;
    const text =
      e.kind === "created"
        ? `New ticket ${e.ticketNo}`
        : e.kind === "reply"
          ? side === "requester"
            ? `BetterYou Support replied to ${e.ticketNo}`
            : `New reply on ${e.ticketNo}`
          : `${e.ticketNo} is now ${e.status.replace("_", " ")}`;
    // Background tab: a system notification, since a toast would go unseen.
    if (document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        const n = new Notification(text, { body: "BetterYou Support", icon: "/icons/icon-192.png", tag: `support-${e.ticketId}` });
        n.onclick = () => {
          window.focus();
          router.push(`${base}/${e.ticketId}`);
          n.close();
        };
      } catch {
        /* some mobile browsers only allow notifications from a service worker */
      }
    }
    toast(
      (t) => (
        <button
          type="button"
          onClick={() => {
            toast.dismiss(t.id);
            router.push(`${base}/${e.ticketId}`);
          }}
          className="text-left text-sm cursor-pointer"
        >
          <span className="font-medium">{text}</span>
          <span className="block text-xs opacity-70">Click to open</span>
        </button>
      ),
      { icon: "💬", duration: 6000 },
    );
  });

  return null;
}
