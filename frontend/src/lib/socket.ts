import { io, Socket } from "socket.io-client";

/**
 * Production-safe socket URL resolver
 * 
 * Priority:
 * 1. NEXT_PUBLIC_API_URL (recommended)
 * 2. Fallback to localhost (development)
 */

const getSocketUrl = (): string => {
    if (process.env.NEXT_PUBLIC_SOCKET_URL) {
        console.log("🔌 Socket connecting to:", process.env.NEXT_PUBLIC_SOCKET_URL);
        return process.env.NEXT_PUBLIC_SOCKET_URL;
    }

    // Local development fallback
    return "http://localhost:3001";
};
console.log("🔌 Socket connecting to:", getSocketUrl());

export const socketUrl = getSocketUrl();
console.log("🔌 Socket connecting to:", socketUrl);

export const createSocket = (query?: any): Socket => {
    return io(socketUrl, {
        transports: ["websocket"], // Force websocket (avoid polling issues)
        withCredentials: true,
        query,
    });
};