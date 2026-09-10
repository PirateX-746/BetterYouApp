"use client";

import { useEffect, useRef } from "react";

export interface SseEvent<T = unknown> {
  type: string;
  data: T;
}

type Handler = (event: SseEvent) => void;

// Connect directly to the backend to avoid the Next.js rewrite proxy, which
// buffers streaming responses and breaks SSE. This mirrors how WebSocket
// connections bypass the proxy via NEXT_PUBLIC_SOCKET_URL.
function getSseBase(): string {
  if (typeof window === "undefined") return "";
  return (
    process.env.NEXT_PUBLIC_SOCKET_URL ??
    process.env.NEXT_PUBLIC_API_URL?.replace(/^\/api/, "") ??
    "http://localhost:3001"
  );
}

/**
 * Connects to the backend SSE stream for `userId` and calls `onEvent` on every
 * named event. Automatically reconnects with exponential back-off on error.
 */
export function useSSE(userId: string | null, onEvent: Handler): void {
  const handlerRef = useRef<Handler>(onEvent);
  useEffect(() => {
    handlerRef.current = onEvent;
  });

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;

    const base = getSseBase();
    // No userId in the query string: the server binds the stream to the
    // authenticated user from the session cookie. `userId` is still a hook
    // argument because it gates *when* to connect and forces a reconnect on
    // account switch.
    const url = `${base}/sse/stream`;

    let es: EventSource | null = null;
    let retryDelay = 1_000;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    function connect() {
      if (destroyed) return;

      es = new EventSource(url, { withCredentials: true });

      es.addEventListener("connected", () => {
        retryDelay = 1_000; // reset back-off on successful connect
      });

      for (const eventName of ["new_message", "unread_reset"] as const) {
        es.addEventListener(eventName, (e: MessageEvent) => {
          try {
            handlerRef.current({ type: eventName, data: JSON.parse(e.data) });
          } catch {
            /* malformed payload — ignore */
          }
        });
      }

      es.onerror = () => {
        es?.close();
        es = null;
        if (!destroyed) {
          retryTimer = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 2, 30_000);
            connect();
          }, retryDelay);
        }
      };
    }

    connect();

    return () => {
      destroyed = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
    };
  }, [userId]);
}
