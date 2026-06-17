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
import { createSocket } from "@/lib/socket";
import { useRouter } from "next/navigation";

/* ─── Types ─── */

export type NotificationKind = "check_in" | "appt_cancelled" | "appt_rescheduled";

export interface CheckInNotification {
  id: string;
  kind: NotificationKind;
  appointmentId: string;
  patientName: string;
  appointmentTitle: string;
  appointmentStart: string;
  checkedInAt: string;
  read: boolean;
}

interface NotificationsCtx {
  notifications: CheckInNotification[];
  unreadCount: number;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
  navigateTo: (n: CheckInNotification) => void;
}

const NotificationsContext = createContext<NotificationsCtx>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  dismiss: () => {},
  clearAll: () => {},
  navigateTo: () => {},
});

/* ─── Provider ─── */

export function PractitionerNotificationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [practitionerId, setPractitionerId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<CheckInNotification[]>([]);
  const socketRef = useRef<ReturnType<typeof createSocket> | null>(null);

  // Read practitionerId client-side once
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPractitionerId(localStorage.getItem("userId"));
    }
  }, []);

  // Request desktop notification permission
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Socket — one connection per practitioner session
  useEffect(() => {
    if (!practitionerId) return;

    const socket = createSocket({ practitionerId });
    socketRef.current = socket;

    const pushNotification = (n: Omit<CheckInNotification, "id" | "read">, desktopTitle: string, desktopBody: string) => {
      const notification: CheckInNotification = {
        ...n,
        id: `${n.appointmentId}-${n.kind}-${Date.now()}`,
        read: false,
      };
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification(desktopTitle, { body: desktopBody, icon: "/favicon.ico", tag: notification.id });
      }
    };

    socket.on(
      "patientCheckedIn",
      (payload: Omit<CheckInNotification, "id" | "read" | "kind">) => {
        const apptTime = new Date(payload.appointmentStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        pushNotification(
          { ...payload, kind: "check_in" },
          "BetterYou — Patient Arrived",
          `${payload.patientName} has arrived for the ${apptTime} ${payload.appointmentTitle}`,
        );
      },
    );

    socket.on(
      "appointmentUpdated",
      (payload: {
        id: string;
        title: string;
        start: string;
        patientName?: string;
        status?: string;
        deleted?: boolean;
        previousStart?: string;
      }) => {
        const status = payload.status?.toLowerCase();
        const name = payload.patientName ?? "A patient";
        const apptTime = new Date(payload.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        if (status === "cancelled") {
          pushNotification(
            { kind: "appt_cancelled", appointmentId: payload.id, patientName: name, appointmentTitle: payload.title, appointmentStart: payload.start, checkedInAt: new Date().toISOString() },
            "BetterYou — Appointment Cancelled",
            `${name} cancelled the ${apptTime} ${payload.title}`,
          );
        } else if (payload.previousStart && payload.previousStart !== payload.start) {
          pushNotification(
            { kind: "appt_rescheduled", appointmentId: payload.id, patientName: name, appointmentTitle: payload.title, appointmentStart: payload.start, checkedInAt: new Date().toISOString() },
            "BetterYou — Appointment Rescheduled",
            `${name} rescheduled the ${payload.title} to ${apptTime}`,
          );
        }
      },
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [practitionerId]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const navigateTo = useCallback(
    (n: CheckInNotification) => {
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
      );
      router.push(`/waiting-room`);
    },
    [router],
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, markAllRead, dismiss, clearAll, navigateTo }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export const usePractitionerNotifications = () =>
  useContext(NotificationsContext);
