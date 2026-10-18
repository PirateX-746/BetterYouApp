"use client";

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
