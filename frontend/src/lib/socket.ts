import { io, Socket } from "socket.io-client";

/**
 * Production-safe socket URL resolver
 * 
 * Priority:
 * 1. NEXT_PUBLIC_API_URL (recommended)
 * 2. Fallback to localhost (development)
 */

const getSocketUrl = (): string => {
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }

    // Local development fallback
    return "http://localhost:3001";
};

export const socketUrl = getSocketUrl();

export const createSocket = (query?: any): Socket => {
    return io(socketUrl, {
        transports: ["websocket"], // Force websocket (avoid polling issues)
        withCredentials: true,
        query,
    });
};