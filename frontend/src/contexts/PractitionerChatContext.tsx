"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface PractitionerChatCtx {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

const PractitionerChatContext = createContext<PractitionerChatCtx>({
  chatOpen: false,
  setChatOpen: () => {},
  activeConversationId: null,
  setActiveConversationId: () => {},
});

export function PractitionerChatProvider({ children }: { children: ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  return (
    <PractitionerChatContext.Provider
      value={{ chatOpen, setChatOpen, activeConversationId, setActiveConversationId }}
    >
      {children}
    </PractitionerChatContext.Provider>
  );
}

export const usePractitionerChat = () => useContext(PractitionerChatContext);
