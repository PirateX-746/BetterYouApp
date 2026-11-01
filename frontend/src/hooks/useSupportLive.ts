"use client";

import { useEffect, useRef } from "react";
import { ADMIN_STORAGE, isAdminPortal } from "@/lib/portal";
import { acquireSocket, releaseSocket } from "@/lib/useAppSocket";

/** Mirrors SupportTicketEvent in backend/src/support/support.gateway.ts. */
export interface SupportTicketEvent {
  ticketId: string;
  ticketNo: string;
  status: string;
  kind: "created" | "reply" | "status";
  by: "requester" | "support";
}

/**
 * Subscribes to live support updates over the shared app socket. Identity
 * comes from the session cookie server-side; the query only keys the shared
 * connection, so practitioners reuse the socket their other features opened.
 */
export function useSupportLive(onEvent: (e: SupportTicketEvent) => void) {
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  });

  useEffect(() => {
    // portal=admin makes the server read the console's own session cookie.
    const query: Record<string, string> = isAdminPortal()
      ? { platformAdminId: localStorage.getItem(ADMIN_STORAGE.userId) ?? "me", portal: "admin" }
      : { practitionerId: localStorage.getItem("userId") ?? "me" };
    const socket = acquireSocket(query);
    const listener = (e: SupportTicketEvent) => handler.current(e);
    socket.on("supportTicketUpdated", listener);
    return () => {
      socket.off("supportTicketUpdated", listener);
      releaseSocket(query);
    };
  }, []);
}
