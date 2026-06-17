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
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { useSSE, type SseEvent } from "@/hooks/useSSE";
import { usePatientChat } from "./PatientChatContext";

interface PatientUnreadCtx {
  totalUnread: number;
  syncUnread: () => void;
}

const PatientUnreadContext = createContext<PatientUnreadCtx>({
  totalUnread: 0,
  syncUnread: () => {},
});

export function PatientUnreadProvider({ children }: { children: ReactNode }) {
  const { activeConversationId } = usePatientChat();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);

  const activeConvRef = useRef<string | null>(activeConversationId);
  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPatientId(localStorage.getItem("userId"));
    }
  }, []);

  const fetchUnread = useCallback(async (id: string) => {
    try {
      const res = await api.get(`/chat/conversations/${id}`);
      if (Array.isArray(res.data)) {
        const total = res.data.reduce(
          (acc: number, c: Record<string, unknown>) =>
            acc + ((c.unreadForPatient as number) || 0),
          0,
        );
        setTotalUnread(total);
      }
    } catch { /* silent */ }
  }, []);

  const syncUnread = useCallback(() => {
    if (patientId) fetchUnread(patientId);
  }, [patientId, fetchUnread]);

  useEffect(() => {
    if (patientId) fetchUnread(patientId);
  }, [patientId, fetchUnread]);

  const handleSseEvent = useCallback((event: SseEvent) => {
    if (event.type === "new_message") {
      const d = event.data as {
        conversationId: string;
        totalUnread: number;
        preview?: string;
      };
      if (activeConvRef.current === d.conversationId) return;
      setTotalUnread(d.totalUnread);
      toast("New message from your practitioner", {
        icon: "💬",
        duration: 4000,
      });
    } else if (event.type === "unread_reset") {
      const d = event.data as { totalUnread: number };
      setTotalUnread(d.totalUnread);
    }
  }, []);

  useSSE(patientId, handleSseEvent);

  return (
    <PatientUnreadContext.Provider value={{ totalUnread, syncUnread }}>
      {children}
    </PatientUnreadContext.Provider>
  );
}

export const usePatientUnread = () => useContext(PatientUnreadContext);
