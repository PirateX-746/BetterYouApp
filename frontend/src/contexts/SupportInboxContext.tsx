"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { supportAdminApi, supportApi, type SupportTicket } from "@/lib/support";
import { useSupportLive } from "@/hooks/useSupportLive";

/**
 * Support tickets with something new from the other side — the durable half
 * of support notifications (the live half is SupportLiveToaster).
 *
 * The server keeps the unread flag per side, so whatever happened while you
 * were away is here on your next visit. The list re-fetches on every live
 * event, when the window regains focus, and on navigation (opening a ticket
 * marks it read server-side).
 */
type Side = "requester" | "support";

interface SupportInboxCtx {
  side: Side;
  tickets: SupportTicket[];
  refresh: () => void;
}

const Ctx = createContext<SupportInboxCtx>({ side: "requester", tickets: [], refresh: () => {} });

export function SupportInboxProvider({ side, children }: { side: Side; children: ReactNode }) {
  const pathname = usePathname();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  const refresh = useCallback(() => {
    (side === "support" ? supportAdminApi.unread() : supportApi.unread())
      .then(setTickets)
      .catch(() => {
        /* signed out or offline — keep what we have */
      });
  }, [side]);

  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  useSupportLive(() => refresh());

  // The ticket on screen is being read right now, even if the server flag
  // was set by an event a moment ago (the page re-fetch clears it).
  const base = side === "support" ? "/admin/support/" : "/support/";
  const viewing = pathname.startsWith(base) ? pathname.slice(base.length) : null;
  const visible = viewing ? tickets.filter((t) => t._id !== viewing) : tickets;

  return <Ctx.Provider value={{ side, tickets: visible, refresh }}>{children}</Ctx.Provider>;
}

export const useSupportInbox = () => useContext(Ctx);

/** How a bell entry describes this ticket's latest event. */
export function describeSupportEvent(t: SupportTicket, side: Side): string {
  const status = t.status.replace("_", " ");
  if (t.lastEventKind === "status") {
    return side === "requester" ? `Support marked it ${status}` : `${t.requesterName} marked it ${status}`;
  }
  if (t.lastEventKind === "created" || (!t.lastEventKind && side === "support" && t.messageCount <= 1)) {
    return `New ticket from ${t.requesterName}${t.practiceName ? ` · ${t.practiceName}` : ""}`;
  }
  return side === "requester" ? "BetterYou Support replied" : `${t.requesterName} replied`;
}
