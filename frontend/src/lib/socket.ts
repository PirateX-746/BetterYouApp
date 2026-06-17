import { io, Socket } from "socket.io-client";

const getSocketUrl = (): string =>
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";

export const socketUrl = getSocketUrl();

export const createSocket = (query?: Record<string, string>): Socket =>
  io(socketUrl, {
    transports: ["websocket"],
    withCredentials: true,
    query,
  });