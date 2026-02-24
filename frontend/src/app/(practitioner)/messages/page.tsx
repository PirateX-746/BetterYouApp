"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

/* ================= TYPES ================= */

type Conversation = {
    _id: string;
    name: string;
    unread?: number;
};

type Message = {
    _id?: string;
    conversationId: string;
    senderId: string;
    text?: string;
    image?: string;
    status?: "sent" | "delivered" | "seen";
    createdAt: string;
};

/* ================= COMPONENT ================= */

export default function MessagesPage() {
    const [practitionerId, setPractitionerId] = useState<string | null>(null);
    const API = "/api";
    const [socketUrl, setSocketUrl] = useState("http://localhost:3001");
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [socket, setSocket] = useState<Socket | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selected, setSelected] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [typing, setTyping] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const [showNewChat, setShowNewChat] = useState(false);
    const [allPatients, setAllPatients] = useState<any[]>([]);
    const [isLoadingPatients, setIsLoadingPatients] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const selectedRef = useRef<Conversation | null>(null);

    useEffect(() => {
        const id = localStorage.getItem("userId");
        console.log('[Practitioner] practitionerId from localStorage:', id);
        setPractitionerId(id);

        if (typeof window !== "undefined") {
            const domain = window.location.hostname;
            setSocketUrl(`${window.location.protocol}//${domain}:3001`);
        }
    }, []);

    useEffect(() => {
        selectedRef.current = selected;
    }, [selected]);

    console.log('[Practitioner] Render. practitionerId:', practitionerId, 'API:', API, 'selected:', selected?._id);

    /* ================= SAFE FETCH ================= */

    const safeFetch = async (url: string, options?: RequestInit) => {
        try {
            const res = await fetch(url, options);
            if (!res.ok) throw new Error("Network error");
            const text = await res.text();
            return text ? JSON.parse(text) : null;
        } catch (err) {
            console.error("Fetch error:", err);
            return null;
        }
    };

    /* ================= FETCH CONVERSATIONS ================= */

    const fetchConversations = async () => {
        if (!practitionerId) return;
        console.log('[Practitioner] fetching conversations for:', practitionerId);
        const data = await safeFetch(`${API}/chat/conversations/${practitionerId}`);

        if (!Array.isArray(data)) {
            setConversations([]);
            return;
        }

        const mapped: Conversation[] = data.map((conv: any) => ({
            _id: conv._id,
            name: conv.patientId?.firstName ? `${conv.patientId.firstName} ${conv.patientId.lastName}` : "Patient",
            unread: conv.unreadForPractitioner || 0,
        }));

        setConversations(mapped);
    };

    /* ================= FETCH MESSAGES ================= */

    const fetchMessages = async (conversationId: string) => {
        const data = await safeFetch(`${API}/chat/messages/${conversationId}`);
        if (Array.isArray(data)) {
            setMessages(data);
        } else {
            setMessages([]);
        }
    };

    /* ================= FETCH ALL PATIENTS ================= */

    const fetchAllPatients = async () => {
        if (!practitionerId) return;
        setIsLoadingPatients(true);
        console.log('[Practitioner] fetching patients...');
        const data = await safeFetch(`${API}/patients`);
        console.log('[Practitioner] patients data:', data);
        if (Array.isArray(data)) setAllPatients(data);
        setIsLoadingPatients(false);
    };

    /* ================= START NEW CHAT ================= */

    const startNewChat = async (patientId: string) => {
        console.log('[Practitioner] startNewChat called with patientId:', patientId);
        if (!practitionerId) {
            console.error('[Practitioner] Cannot start chat: practitionerId is null');
            return;
        }
        const conv = await safeFetch(`${API}/chat/conversation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ patientId, practitionerId }),
        });

        console.log('[Practitioner] POST /chat/conversation result:', conv);

        if (!conv || !conv._id) {
            console.error("[Practitioner] Invalid conversation returned:", conv);
            return;
        }

        await fetchConversations();

        const newConv: Conversation = {
            _id: conv._id,
            name: conv.patientId?.firstName ? `${conv.patientId.firstName} ${conv.patientId.lastName}` : "Patient",
            unread: 0,
        };

        setSelected(newConv);
        setShowNewChat(false);
    };

    /* ================= INITIAL LOAD ================= */

    useEffect(() => {
        fetchConversations();
    }, [practitionerId]);

    useEffect(() => {
        if (!selected) return;
        fetchMessages(selected._id);
        setConversations(prev =>
            prev.map(c => (c._id === selected._id ? { ...c, unread: 0 } : c))
        );

        if (practitionerId) {
            safeFetch(`${API}/chat/reset-unread/${selected._id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: "practitioner" }),
            });
        }

        if (socket) {
            console.log('[Practitioner] Auto-joining room:', selected._id);
            socket.emit("joinConversation", selected._id);
        }
    }, [selected, socket]);

    /* ================= SOCKET INIT ================= */

    useEffect(() => {
        if (!practitionerId) return;

        console.log('[Practitioner] Connecting socket to:', socketUrl, 'for user:', practitionerId);
        const s = io(socketUrl, {
            query: { userId: practitionerId },
        });

        setSocket(s);

        s.on("onlineUsers", setOnlineUsers);

        s.on("message", (msg: Message) => {
            console.log('[Practitioner] Socket received message:', msg, 'current selectedRef:', selectedRef.current?._id);
            if (msg.conversationId === selectedRef.current?._id) {
                setMessages(prev => [...prev, msg]);
                // Emit seen if we are looking at this conversation
                if (practitionerId && msg.senderId !== practitionerId) {
                    s.emit("seen", { messageId: msg._id, conversationId: msg.conversationId });
                }
            } else {
                setConversations(prev =>
                    prev.map(c =>
                        c._id === msg.conversationId
                            ? { ...c, unread: (c.unread || 0) + 1 }
                            : c
                    )
                );
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
            console.log('[Practitioner] Disconnecting socket');
            s.disconnect();
        };
    }, [practitionerId, socketUrl]);

    /* ================= AUTO SCROLL ================= */

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    /* ================= SEND MESSAGE ================= */

    const sendMessage = () => {
        if (!input.trim() || !selected || !socket) {
            console.log('[Practitioner] Cannot send: input empty or no selected/socket');
            return;
        }
        console.log('[Practitioner] Sending message to:', selected._id);
        socket.emit("message", {
            conversationId: selected._id,
            senderId: practitionerId,
            text: input,
        });
        setInput("");
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
            const date = new Date(msg.createdAt).toLocaleDateString();
            if (!groups[date]) groups[date] = [];
            groups[date].push(msg);
        });
        return groups;
    };

    const groupedMessages = groupByDate(messages);

    /* ================= UI ================= */

    return (
        <div className="h-screen w-full flex bg-[#F8FAFC]">
            {/* LEFT PANEL */}
            <div className={`${selected ? "hidden md:flex" : "flex"} w-full md:w-1/4 bg-white border-r flex-col`}>
                <div className="p-4 border-b flex justify-between items-center">
                    <span className="font-semibold text-black">Messages</span>
                    <button
                        onClick={() => { fetchAllPatients(); setShowNewChat(true); }}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                    >
                        + New
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {conversations.map(conv => (
                        <div
                            key={conv._id}
                            onClick={() => {
                                setSelected(conv);
                            }}
                            className={`p-4 border-b hover:bg-gray-50 cursor-pointer flex justify-between items-center ${selected?._id === conv._id ? 'bg-gray-50' : ''}`}
                        >
                            <p className="font-medium text-black">{conv.name}</p>
                            {conv.unread ? (
                                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                    {conv.unread}
                                </span>
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT PANEL */}
            <div className={`${selected ? "flex" : "hidden md:flex"} flex-1 flex-col bg-white`}>
                {!selected ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        Select a conversation
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSelected(null)} className="md:hidden text-blue-600">←</button>
                                <p className="font-semibold text-black">{selected.name}</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F9FAFB]">
                            {Object.entries(groupedMessages).map(([date, msgs]) => (
                                <div key={date}>
                                    <div className="text-center text-xs text-gray-400 mb-4">{date}</div>
                                    {msgs.map(msg => (
                                        <div key={msg._id} className={`flex ${msg.senderId === practitionerId ? "justify-end" : "justify-start"}`}>
                                            <div className={`px-4 py-2 rounded-lg max-w-xs text-sm ${msg.senderId === practitionerId ? "bg-blue-600 text-white" : "bg-white border text-black"}`}>
                                                {msg.text}
                                                <div className={`text-[10px] mt-1 opacity-70 flex justify-end gap-1 ${msg.senderId === practitionerId ? "text-blue-100" : "text-gray-400"}`}>
                                                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                                    {msg.senderId === practitionerId && (
                                                        <span>
                                                            {msg.status === 'seen' ? '✓✓' : msg.status === 'delivered' ? '✓' : '...'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                            {typing && (
                                <div className="flex justify-start mb-4">
                                    <div className="bg-gray-100 text-gray-500 text-xs p-2 rounded-lg animate-pulse">
                                        Patient is typing...
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 border-t flex gap-2">
                            <input
                                value={input}
                                onChange={(e) => { setInput(e.target.value); handleTyping(); }}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                className="flex-1 border rounded-md px-3 py-2 text-sm text-black"
                                placeholder="Type a message..."
                            />
                            <button onClick={sendMessage} className="bg-blue-600 text-white px-4 rounded-md">
                                Send
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* New Chat Modal */}
            {showNewChat && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-full max-w-md p-6 max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-black">New Chat</h2>
                            <button onClick={() => setShowNewChat(false)} className="text-gray-500 text-2xl">&times;</button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4 text-black">Select a patient to message</p>
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {isLoadingPatients ? (
                                <p className="text-center text-gray-400 py-4 text-black">Loading patients...</p>
                            ) : allPatients.length === 0 ? (
                                <p className="text-center text-gray-400 py-4 text-black">No patients available</p>
                            ) : (
                                allPatients.map((p) => (
                                    <div
                                        key={p._id}
                                        onClick={() => {
                                            console.log('[Practitioner] Clicked patient:', p._id);
                                            startNewChat(p._id);
                                        }}
                                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                                    >
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold uppercase">
                                            {p.firstName[0]}{p.lastName[0]}
                                        </div>
                                        <div>
                                            <p className="font-medium text-black">{p.firstName} {p.lastName}</p>
                                            <p className="text-xs text-gray-500">{p.email}</p>
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