"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useClientValue } from "@/hooks/useClientValue";
import { fetchUnreadTotal } from "@/lib/chatUnread";
import { useSSE, type SseEvent } from "@/hooks/useSSE";
import { usePractitionerChat } from "./PractitionerChatContext";

interface UnreadCtx {
  totalUnread: number;
  clearUnread: () => void;
  syncUnread: () => void;
}

const UnreadContext = createContext<UnreadCtx>({
  totalUnread: 0,
  clearUnread: () => {},
  syncUnread: () => {},
});

function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

function fireDesktopNotification(body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  new Notification("BetterYou — New Message", {
    body,
    icon: "/favicon.ico",
    tag: "new-message",
  });
}

export function PractitionerUnreadProvider({ children }: { children: ReactNode }) {
  const { activeConversationId } = usePractitionerChat();
  const practitionerId = useClientValue(() => localStorage.getItem("userId"), null);
  const [totalUnread, setTotalUnread] = useState(0);

  // Keep active conversation in a ref so the SSE handler reads the latest value
  const activeConvRef = useRef<string | null>(activeConversationId);
  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  /* Initial count from server */
  const fetchUnread = useCallback((id: string) => {
    fetchUnreadTotal(id, "unreadForPractitioner").then((total) => {
      if (total !== null) setTotalUnread(total);
    });
  }, []);

  const syncUnread = useCallback(() => {
    if (practitionerId) fetchUnread(practitionerId);
  }, [practitionerId, fetchUnread]);

  useEffect(() => {
    if (practitionerId) fetchUnread(practitionerId);
  }, [practitionerId, fetchUnread]);

  /* SSE handler — replaces the broken socket approach */
  const handleSseEvent = useCallback((event: SseEvent) => {
    if (event.type === "new_message") {
      const d = event.data as {
        conversationId: string;
        totalUnread: number;
        senderName?: string;
        preview?: string;
      };

      // Skip if the practitioner currently has this conversation open
      if (activeConvRef.current === d.conversationId) return;

      setTotalUnread(d.totalUnread);
      fireDesktopNotification(d.preview ? `"${d.preview}"` : "New message received");
    } else if (event.type === "unread_reset") {
      const d = event.data as { totalUnread: number };
      setTotalUnread(d.totalUnread);
    }
  }, []);

  useSSE(practitionerId, handleSseEvent);

  const clearUnread = useCallback(() => setTotalUnread(0), []);

  return (
    <UnreadContext.Provider value={{ totalUnread, clearUnread, syncUnread }}>
      {children}
    </UnreadContext.Provider>
  );
}

export const usePractitionerUnread = () => useContext(UnreadContext);
