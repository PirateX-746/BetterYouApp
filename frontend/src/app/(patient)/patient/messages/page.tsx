"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { acquireSocket, releaseSocket } from "@/lib/useAppSocket";
import { api } from "@/lib/api";
import { Message, Conversation } from "@/types/chat";
import { usePractitioners } from "@/hooks/usePractitioners";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ArrowLeft, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePatientChat } from "@/contexts/PatientChatContext";
import { Modal } from "@/components/common/Modal";
import { LoadingState } from "@/components/ui/loading-state";

export default function MessagesPage() {
  const userId = useLocalStorage("userId");
  const { setChatOpen, setActiveConversationId } = usePatientChat();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelectedRaw] = useState<Conversation | null>(null);
  const setSelected = (conv: Conversation | null) => {
    setSelectedRaw(conv);
    setChatOpen(conv !== null);
    setActiveConversationId(conv?._id ?? null);
  };
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);

  const { practitioners, loading: loadingPractitioners } = usePractitioners();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const selectedRef = useRef<Conversation | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  /* ── Fetch conversations ── */
  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await api.get(`/chat/conversations/${userId}`);
      const data = res.data;
      if (!Array.isArray(data)) { setConversations([]); return; }
      setConversations(
        data.map((conv: Record<string, unknown> & { practitionerId?: { firstName?: string; lastName?: string } }) => ({
          _id: conv._id as string,
          name: conv.practitionerId?.firstName
            ? `Dr. ${conv.practitionerId.firstName} ${conv.practitionerId.lastName}`
            : "Practitioner",
          unread: (conv.unreadForPatient as number) || 0,
        }))
      );
    } catch { /* silently handle */ }
  }, [userId]);

  /* ── Fetch messages ── */
  const fetchMessages = async (conversationId: string) => {
    try {
      const res = await api.get(`/chat/messages/${conversationId}`);
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch { setMessages([]); }
  };

  /* ── Start new chat ── */
  const startNewChat = async (practitionerId: string) => {
    if (!userId) return;
    try {
      const res = await api.post(`/chat/conversation`, { patientId: userId, practitionerId });
      const conv = res.data as Record<string, unknown> & { practitionerId?: { firstName?: string; lastName?: string } };
      if (!conv?._id) return;
      await fetchConversations();
      setSelected({
        _id: conv._id as string,
        name: conv.practitionerId?.firstName
          ? `Dr. ${conv.practitionerId.firstName} ${conv.practitionerId.lastName}`
          : "Practitioner",
        unread: 0,
      });
      setShowNewChat(false);
    } catch { /* user can retry */ }
  };

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Reset chatOpen when leaving the page
  useEffect(() => () => setChatOpen(false), [setChatOpen]);

  useEffect(() => {
    if (!selected) return;
    fetchMessages(selected._id);
    setConversations(prev => prev.map(c => c._id === selected._id ? { ...c, unread: 0 } : c));
    if (userId) {
      api.post(`/chat/reset-unread/${selected._id}`, {
        role: "patient",
        userId,
      }).catch(() => {});
    }
    if (socket) socket.emit("joinConversation", selected._id);
  }, [selected, socket, userId]);

  /* ── Socket ── */
  useEffect(() => {
    if (!userId) return;
    const s = acquireSocket({ userId });
    setSocket(s);

    const handleMessage = (msg: Message) => {
      if (msg.conversationId === selectedRef.current?._id) {
        setMessages(prev => [...prev, msg]);
        if (msg.senderId !== userId) s.emit("seen", { messageId: msg._id, conversationId: msg.conversationId });
      } else {
        setConversations(prev => prev.map(c => c._id === msg.conversationId ? { ...c, unread: (c.unread || 0) + 1 } : c));
      }
    };
    const handleTypingEvent = (cid: string) => { if (cid === selectedRef.current?._id) setTyping(true); };
    const handleStopTyping = () => setTyping(false);
    const handleMessageSeen = (messageId: string) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status: "seen" } : m));
    };

    s.on("message", handleMessage);
    s.on("typing", handleTypingEvent);
    s.on("stopTyping", handleStopTyping);
    s.on("messageSeen", handleMessageSeen);

    return () => {
      s.off("message", handleMessage);
      s.off("typing", handleTypingEvent);
      s.off("stopTyping", handleStopTyping);
      s.off("messageSeen", handleMessageSeen);
      releaseSocket({ userId });
    };
  }, [userId]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Auto-resize textarea ── */
  const adjustTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  /* ── Send ── */
  const sendMessage = () => {
    if (!input.trim() || !selected || !socket) return;
    socket.emit("message", { conversationId: selected._id, senderId: userId, text: input });
    setInput("");
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; }
  };

  const handleTyping = () => {
    if (!socket || !selected) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    else socket.emit("typing", selected._id);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", selected._id);
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const groupByDate = (msgs: Message[]) => {
    const groups: Record<string, Message[]> = {};
    msgs.forEach(msg => {
      const date = new Date(msg.createdAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      (groups[date] ??= []).push(msg);
    });
    return groups;
  };
  const groupedMessages = groupByDate(messages);

  const initials = (name: string) => name.replace("Dr. ", "").charAt(0).toUpperCase();

  /* ── Layout ── */
  return (
    /* fills the flex column main that the layout gives us */
    <div className="flex flex-1 min-h-0 h-full bg-bg-page overflow-hidden">
      {/* ── LEFT: Conversation list ── */}
      <aside
        className={`${selected ? "hidden md:flex" : "flex"} w-full md:w-72 lg:w-80 flex-col bg-bg-card border-r border-border shrink-0`}
      >
        {/* Header */}
        <div className="h-14 px-4 border-b border-border flex items-center justify-between shrink-0">
          <span className="font-semibold text-text-primary">Messages</span>
          <button
            onClick={() => setShowNewChat(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary-hover transition"
            aria-label="New conversation"
          >
            <Plus size={15} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border pb-16 md:pb-0">
          {conversations.length === 0 && (
            <p className="text-center text-text-secondary text-sm py-14 px-4 leading-relaxed">
              No conversations yet.<br />Tap <strong>+</strong> to start one.
            </p>
          )}
          {conversations.map(conv => (
            <button
              key={conv._id}
              onClick={() => setSelected(conv)}
              className={`w-full text-left px-4 py-3.5 hover:bg-bg-hover transition-colors flex items-center gap-3 ${selected?._id === conv._id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                {initials(conv.name)}
              </div>
              <p className="flex-1 font-medium text-text-primary text-sm truncate">{conv.name}</p>
              {!!conv.unread && (
                <span className="bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium shrink-0">
                  {conv.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* ── RIGHT: Chat view ── */}
      <div className={`${selected ? "flex" : "hidden md:flex"} flex-1 flex-col min-h-0 bg-bg-page`}>
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-text-disabled">
            <div className="w-14 h-14 rounded-2xl bg-bg-card border border-border flex items-center justify-center text-2xl shadow-sm">
              💬
            </div>
            <p className="text-sm font-medium text-text-secondary">Select a conversation</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="h-14 px-4 bg-bg-card border-b border-border flex items-center gap-3 shrink-0">
              <button
                onClick={() => setSelected(null)}
                className="md:hidden p-1.5 -ml-1 rounded-full hover:bg-bg-hover transition text-text-secondary"
                aria-label="Back"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                {initials(selected.name)}
              </div>
              <div>
                <p className="font-semibold text-text-primary text-sm leading-tight">{selected.name}</p>
                <p className="text-xs text-text-secondary">Practitioner</p>
              </div>
            </div>

            {/* Messages — grows & scrolls */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 min-h-0">
              {Object.entries(groupedMessages).map(([date, msgs]) => (
                <div key={date}>
                  <div className="flex justify-center mb-4">
                    <span className="bg-bg-card border border-border text-text-secondary text-xs px-3 py-1 rounded-full shadow-sm">
                      {date}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {msgs.map((msg, i) => {
                      const isMe = msg.senderId === userId;
                      const showAvatar = i === 0 || msgs[i - 1].senderId !== msg.senderId;
                      return (
                        <div
                          key={msg._id}
                          className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          {!isMe && (
                            <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold bg-primary/10 text-primary ${showAvatar ? "visible" : "invisible"}`}>
                              {initials(selected.name)}
                            </div>
                          )}
                          <div className={`px-3.5 py-2.5 rounded-2xl max-w-[78%] text-sm leading-relaxed shadow-sm ${isMe ? "bg-primary text-white rounded-br-sm" : "bg-bg-card border border-border text-text-primary rounded-bl-sm"}`}>
                            {msg.text}
                            <div className={`text-[10px] mt-1 flex items-center gap-1 ${isMe ? "text-white/60 justify-end" : "text-text-secondary"}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              {isMe && (
                                <span className="ml-0.5 font-medium">
                                  {msg.status === "seen" ? "✓✓" : msg.status === "delivered" ? "✓✓" : "✓"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {typing && (
                <div className="flex items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                    {initials(selected.name)}
                  </div>
                  <div className="bg-bg-card border border-border px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5 items-center shadow-sm">
                    {[0, 150, 300].map(delay => (
                      <div key={delay} className="w-1.5 h-1.5 rounded-full bg-text-disabled animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar — pinned to bottom */}
            <div className="px-4 py-3 bg-bg-card border-t border-border shrink-0">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    adjustTextarea();
                    handleTyping();
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1 border border-border focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl px-3.5 py-2.5 text-sm bg-bg-page text-text-primary resize-none transition-all placeholder:text-text-disabled outline-none"
                  placeholder="Type a message…"
                  rows={1}
                  style={{ minHeight: "42px", maxHeight: "120px" }}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  size="icon"
                  className="w-10 h-10 rounded-xl bg-primary hover:bg-primary-hover text-white shrink-0 shadow-sm"
                  aria-label="Send message"
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── New Chat Modal ── */}
      <Modal
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        title="New Conversation"
        subtitle="Choose a practitioner to message"
        maxWidth="sm:max-w-md"
      >
        {loadingPractitioners ? (
          <LoadingState />
        ) : practitioners.length === 0 ? (
          <p className="text-center text-text-secondary text-sm py-10">No practitioners available.</p>
        ) : (
          <div className="space-y-2">
            {practitioners.map(p => (
              <button
                key={p._id}
                onClick={() => startNewChat(p._id)}
                className="w-full flex items-center gap-3 p-3 border border-border rounded-xl hover:bg-bg-hover hover:border-primary/30 transition text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                  {p.firstName[0]}{p.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-primary text-sm truncate">Dr. {p.firstName} {p.lastName}</p>
                  {p.specialization && <p className="text-xs text-text-secondary truncate">{p.specialization}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
