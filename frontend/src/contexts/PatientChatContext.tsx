"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface PatientChatCtx {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

const PatientChatContext = createContext<PatientChatCtx>({
  chatOpen: false,
  setChatOpen: () => {},
  activeConversationId: null,
  setActiveConversationId: () => {},
});

export function PatientChatProvider({ children }: { children: ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  return (
    <PatientChatContext.Provider
      value={{ chatOpen, setChatOpen, activeConversationId, setActiveConversationId }}
    >
      {children}
    </PatientChatContext.Provider>
  );
}

export const usePatientChat = () => useContext(PatientChatContext);
