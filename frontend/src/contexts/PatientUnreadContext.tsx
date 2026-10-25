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
import toast from "react-hot-toast";
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
  const patientId = useClientValue(() => localStorage.getItem("userId"), null);
  const [totalUnread, setTotalUnread] = useState(0);

  const activeConvRef = useRef<string | null>(activeConversationId);
  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  const fetchUnread = useCallback((id: string) => {
    fetchUnreadTotal(id, "unreadForPatient").then((total) => {
      if (total !== null) setTotalUnread(total);
    });
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
