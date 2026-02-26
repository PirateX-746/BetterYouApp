"use client";

import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { socketUrl, createSocket } from "@/lib/socket";
import { api } from "@/lib/api";
import { Message, Conversation } from "@/types/chat";


/* ================= COMPONENT ================= */

export default function MessagesPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const API = "/api";
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [socket, setSocket] = useState<Socket | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selected, setSelected] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [typing, setTyping] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const [showNewChat, setShowNewChat] = useState(false);
    const [allPractitioners, setAllPractitioners] = useState<any[]>([]);
    const [isLoadingPractitioners, setIsLoadingPractitioners] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const selectedRef = useRef<Conversation | null>(null);

    useEffect(() => {
        const id = localStorage.getItem("userId");
        console.log('[Patient] userId from localStorage:', id);
        setUserId(id);

        if (typeof window !== "undefined") {
            console.log('[Patient] Using socket URL:', socketUrl);
        }
    }, []);

    useEffect(() => {
        selectedRef.current = selected;
    }, [selected]);

    console.log('[Patient] Render. userId:', userId, 'API:', API, 'selected:', selected?._id);


    /* ================= FETCH CONVERSATIONS ================= */

    const fetchConversations = async () => {
        if (!userId) return;
        console.log('[Patient] fetching conversations for:', userId);
        try {
            const res = await api.get(`/chat/conversations/${userId}`);
            const data = res.data;
            console.log('[Patient] raw conversations data:', data);

            if (!Array.isArray(data)) {
                setConversations([]);
                return;
            }

            const mapped: Conversation[] = data.map((conv: any) => ({
                _id: conv._id,
                name: conv.practitionerId?.firstName ? `Dr. ${conv.practitionerId.firstName} ${conv.practitionerId.lastName}` : "Practitioner",
                unread: conv.unreadForPatient || 0,
            }));

            setConversations(mapped);
        } catch (err) {
            console.error("[Patient] Error fetching conversations:", err);
        }
    };

    /* ================= FETCH MESSAGES ================= */

    const fetchMessages = async (conversationId: string) => {
        try {
            const res = await api.get(`/chat/messages/${conversationId}`);
            const data = res.data;
            if (Array.isArray(data)) {
                setMessages(data);
            } else {
                setMessages([]);
            }
        } catch (err) {
            console.error("[Patient] Error fetching messages:", err);
        }
    };

    /* ================= FETCH PRACTITIONERS ================= */

    const fetchPractitioners = async () => {
        if (!userId) return;
        setIsLoadingPractitioners(true);
        console.log('[Patient] fetching practitioners...');
        try {
            const res = await api.get(`/practitioners`);
            const data = res.data;
            console.log('[Patient] practitioners data:', data);
            if (Array.isArray(data)) setAllPractitioners(data);
        } catch (err) {
            console.error("[Patient] Error fetching practitioners:", err);
        } finally {
            setIsLoadingPractitioners(false);
        }
    };

    /* ================= START CHAT ================= */

    const startNewChat = async (practitionerId: string) => {
        console.log('[Patient] startNewChat called with practitionerId:', practitionerId);
        if (!userId) {
            console.error('[Patient] Cannot start chat: userId is null');
            return;
        }
        try {
            const res = await api.post(`/chat/conversation`, { patientId: userId, practitionerId });
            const conv = res.data;

            console.log('[Patient] POST /chat/conversation result:', conv);

            if (!conv || !conv._id) {
                console.error("[Patient] Invalid conversation returned:", conv);
                return;
            }

            await fetchConversations();

            const newConv: Conversation = {
                _id: conv._id,
                name: conv.practitionerId?.firstName ? `Dr. ${conv.practitionerId.firstName} ${conv.practitionerId.lastName}` : "Practitioner",
                unread: 0,
            };

            setSelected(newConv);
            setShowNewChat(false);
        } catch (err) {
            console.error("[Patient] Error starting new chat:", err);
        }
    };

    /* ================= INITIAL LOAD ================= */

    useEffect(() => {
        fetchConversations();
    }, [userId]);

    useEffect(() => {
        if (!selected) return;
        fetchMessages(selected._id);
        setConversations(prev => prev.map(c => c._id === selected._id ? { ...c, unread: 0 } : c));

        if (userId) {
            api.post(`/chat/reset-unread/${selected._id}`, {
                role: "patient"
            }).catch(err => console.error("[Patient] Error resetting unread:", err));
        }

        if (socket) {
            console.log('[Patient] Auto-joining room:', selected._id);
            socket.emit("joinConversation", selected._id);
        }
    }, [selected, socket]);

    /* ================= SOCKET ================= */

    useEffect(() => {
        if (!userId) return;
        console.log('[Patient] Connecting socket to:', socketUrl, 'for user:', userId);
        const s = createSocket({ userId });
        setSocket(s);

        s.on("onlineUsers", setOnlineUsers);

        s.on("message", (msg: Message) => {
            console.log('[Patient] Socket received message:', msg, 'current selectedRef:', selectedRef.current?._id);
            if (msg.conversationId === selectedRef.current?._id) {
                setMessages(prev => [...prev, msg]);
                // Emit seen if we are looking at this conversation
                if (userId && msg.senderId !== userId) {
                    s.emit("seen", { messageId: msg._id, conversationId: msg.conversationId });
                }
            } else {
                setConversations(prev => prev.map(c => c._id === msg.conversationId ? { ...c, unread: (c.unread || 0) + 1 } : c));
            }
        });

        s.on("typing", (conversationId: string) => {
            if (conversationId === selectedRef.current?._id) setTyping(true);
        });

        s.on("stopTyping", () => setTyping(false));

        s.on("messageSeen", (messageId: string) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status: 'seen' } : m));
        });

        return () => {
            console.log('[Patient] Disconnecting socket');
            s.disconnect();
        };
    }, [userId, socketUrl]); // Added socketUrl to avoid reconnection

    /* ================= AUTO SCROLL ================= */

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    /* ================= SEND MESSAGE ================= */

    const sendMessage = () => {
        if (!input.trim() || !selected || !socket) return;
        socket.emit("message", {
            conversationId: selected._id,
            senderId: userId,
            text: input,
        });
        setInput("");
    };

    const handleTyping = () => {
        if (!socket || !selected) return;

        // If already typing, clear previous timeout and just let it be
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        else socket.emit("typing", selected._id);

        typingTimeoutRef.current = setTimeout(() => {
            socket.emit("stopTyping", selected._id);
            typingTimeoutRef.current = null;
        }, 2000);
    };

    /* ================= DATE GROUPING ================= */

    const groupByDate = (msgs: Message[]) => {
        const groups: Record<string, Message[]> = {};
        msgs.forEach((msg) => {
            const date = new Date(msg.createdAt).toLocaleDateString();
            if (!groups[date]) groups[date] = [];
            groups[date].push(msg);
        });
        return groups;
    };

    const groupedMessages = groupByDate(messages);

    /* ================= UI ================= */

    return (
        <div className="h-[calc(100vh-68px)] md:h-[calc(100vh-80px)] w-full flex bg-bg-page overflow-hidden md:border md:border-border">
            {/* LEFT PANEL */}
            <div className={`${selected ? "hidden md:flex" : "flex"} w-full md:w-1/3 lg:w-1/4 bg-bg-card border-r border-border flex-col transition-all duration-300`}>
                <div className="p-4 h-16 border-b border-border flex justify-between items-center bg-bg-card z-10">
                    <span className="font-semibold text-text-primary text-lg">Messages</span>
                    <button
                        onClick={() => { fetchPractitioners(); setShowNewChat(true); }}
                        className="text-xs bg-primary text-white px-3 py-1.5 rounded-full font-medium hover:bg-primary-hover transition-colors shadow-sm"
                    >
                        + New
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {conversations.map((conv) => (
                        <div
                            key={conv._id}
                            onClick={() => {
                                setSelected(conv);
                            }}
                            className={`p-4 border-b border-border hover:bg-bg-hover cursor-pointer flex justify-between items-center transition-colors ${selected?._id === conv._id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold uppercase shrink-0">
                                    {conv.name?.replace('Dr. ', '').charAt(0) || "P"}
                                </div>
                                <p className="font-medium text-text-primary truncate">{conv.name}</p>
                            </div>

                            {conv.unread ? (
                                <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full min-w-[1.25rem] text-center font-medium shadow-sm">
                                    {conv.unread}
                                </span>
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT PANEL */}
            <div className={`${selected ? "flex" : "hidden md:flex"} flex-1 flex-col bg-bg-page relative`}>
                {!selected ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-disabled space-y-4">
                        <div className="w-16 h-16 rounded-full bg-bg-card border border-border flex items-center justify-center shadow-sm">
                            <span className="text-3xl">💬</span>
                        </div>
                        <p className="text-lg font-medium">Select a conversation</p>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className="fixed top-0 left-0 md:left-auto md:relative w-full md:w-auto z-20 px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelected(null)}
                                    className="md:hidden text-text-secondary hover:text-primary transition-colors p-2 -ml-2 rounded-full hover:bg-bg-hover"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <div className="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold uppercase shrink-0">
                                    {selected.name?.replace('Dr. ', '').charAt(0) || "P"}
                                </div>
                                <div>
                                    <p className="font-semibold text-text-primary text-base leading-tight">{selected.name}</p>
                                    <p className="text-xs text-text-secondary mt-0.5">Practitioner</p>
                                </div>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto px-3 md:pt-[30px] pt-[70px] pb-4 space-y-3 bg-bg-page">
                            {Object.entries(groupedMessages).map(([date, msgs]) => (
                                <div key={date} className="animate-fadeInUp">
                                    <div className="flex justify-center mb-6 mt-2">
                                        <div className="bg-bg-card border border-border text-text-secondary text-xs px-3 py-1 rounded-full shadow-sm font-medium">
                                            {date}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {msgs.map((msg, index) => {
                                            const isMe = msg.senderId === userId;
                                            const showAvatar = index === 0 || msgs[index - 1].senderId !== msg.senderId;

                                            return (
                                                <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"} gap-2`}>
                                                    {!isMe && (
                                                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-medium text-xs ${showAvatar ? 'bg-primary-light text-primary visible' : 'invisible'}`}>
                                                            {selected?.name?.replace('Dr. ', '').charAt(0) || "P"}
                                                        </div>
                                                    )}
                                                    <div
                                                        className={`relative px-4 py-2.5 rounded-2xl max-w-[75%] sm:max-w-[70%] text-[15px] leading-relaxed shadow-sm ${isMe
                                                            ? "bg-primary text-white rounded-tr-sm"
                                                            : "bg-bg-card border border-border text-text-primary rounded-tl-sm"
                                                            }`}
                                                    >
                                                        {msg.text}
                                                        <div className={`text-[10px] mt-1 flex items-center gap-1.5 ${isMe ? "text-white/80 justify-end" : "text-text-secondary justify-start"}`}>
                                                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                                            {isMe && (
                                                                <span className="flex items-center">
                                                                    {msg.status === 'seen' ? (
                                                                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current text-white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                                                                    ) : msg.status === 'delivered' ? (
                                                                        <svg viewBox="0 0 24 24" className="w-3h-3 fill-current"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                                                                    ) : (
                                                                        <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current opacity-70"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="15 15" /></svg>
                                                                    )}
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
                                <div className="flex justify-start gap-2 animate-fadeInLeft">
                                    <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center font-medium text-xs shrink-0">
                                        {selected?.name?.replace('Dr. ', '').charAt(0) || "P"}
                                    </div>
                                    <div className="bg-bg-card border border-border px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex gap-1.5 items-center">
                                        <div className="w-2 h-2 rounded-full bg-text-disabled animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 rounded-full bg-text-disabled animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 rounded-full bg-text-disabled animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-bg-card border-t border-border shadow-[0_-4px_10px_rgba(0,0,0,0.02)] z-10">
                            <div className="flex gap-3 max-w-4xl mx-auto items-end">
                                <textarea
                                    value={input}
                                    onChange={(e) => { setInput(e.target.value); handleTyping(); }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                    className="flex-1 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-[15px] bg-bg-light text-text-primary resize-none transition-all placeholder:text-text-disabled"
                                    placeholder="Type a message..."
                                    rows={1}
                                    style={{ minHeight: '46px', maxHeight: '120px' }}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!input.trim()}
                                    className="bg-primary text-white p-3 rounded-xl hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 mb-0.5"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* New Chat Modal (Re-styled as sliding overlay or centered modal) */}
            {showNewChat && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
                    <div className="bg-bg-card rounded-2xl w-full max-w-md p-6 max-h-[85vh] flex flex-col shadow-xl animate-scaleIn">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-semibold text-text-primary">New Conversation</h2>
                                <p className="text-sm text-text-secondary mt-1">Select a practitioner to message</p>
                            </div>
                            <button
                                onClick={() => setShowNewChat(false)}
                                className="text-text-disabled hover:text-text-primary hover:bg-bg-hover rounded-full p-2 transition-colors"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {isLoadingPractitioners ? (
                                <div className="flex flex-col items-center justify-center py-10 space-y-3">
                                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                                    <p className="text-text-secondary text-sm">Loading practitioners...</p>
                                </div>
                            ) : allPractitioners.length === 0 ? (
                                <div className="text-center py-10">
                                    <div className="w-16 h-16 bg-bg-light rounded-full flex items-center justify-center mx-auto mb-3">
                                        <span className="text-2xl opacity-50">👨‍⚕️</span>
                                    </div>
                                    <p className="text-text-primary font-medium">No practitioners found</p>
                                    <p className="text-text-secondary text-sm">There are no practitioners available right now.</p>
                                </div>
                            ) : (
                                allPractitioners.map((p) => (
                                    <div
                                        key={p._id}
                                        onClick={() => {
                                            startNewChat(p._id);
                                        }}
                                        className="p-3 border border-border rounded-xl hover:bg-bg-hover hover:border-primary/30 cursor-pointer flex items-center gap-4 transition-all"
                                    >
                                        <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center text-primary font-bold uppercase shrink-0">
                                            {p.firstName[0]}{p.lastName[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-text-primary truncate">Dr. {p.firstName} {p.lastName}</p>
                                            <p className="text-sm text-text-secondary truncate">{p.specialization}</p>
                                        </div>
                                        <div className="text-text-disabled">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                        </div>
                                    </div>
                                )))
                            }
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}