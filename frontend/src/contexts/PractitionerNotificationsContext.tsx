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
import { acquireSocket, releaseSocket } from "@/lib/useAppSocket";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

/* ─── Types ─── */

export type NotificationKind =
  | "check_in"
  | "appt_cancelled"
  | "appt_rescheduled"
  | "appt_reminder";

/** Reminder templates for upcoming appointments — in-app only, no email/SMS. */
const REMINDER_THRESHOLDS = [
  { key: "24h", ms: 24 * 60 * 60 * 1000, phrase: "is coming up tomorrow" },
  { key: "1h", ms: 60 * 60 * 1000, phrase: "starts in about an hour" },
] as const;

/** How often to re-check appointments against the thresholds above. */
const REMINDER_POLL_MS = 5 * 60_000;
/** Width of the firing window so a 5-minute poll can't skip a threshold. */
const REMINDER_WINDOW_MS = 6 * 60_000;

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
  const socketRef = useRef<ReturnType<typeof acquireSocket> | null>(null);

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

  const pushNotification = useCallback(
    (n: Omit<CheckInNotification, "id" | "read">, desktopTitle: string, desktopBody: string) => {
      const notification: CheckInNotification = {
        ...n,
        id: `${n.appointmentId}-${n.kind}-${Date.now()}`,
        read: false,
      };
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification(desktopTitle, { body: desktopBody, icon: "/favicon.ico", tag: notification.id });
      }
    },
    [],
  );

  // Socket — one connection per practitioner session
  useEffect(() => {
    if (!practitionerId) return;

    const socket = acquireSocket({ practitionerId });
    socketRef.current = socket;

    const handlePatientCheckedIn = (payload: Omit<CheckInNotification, "id" | "read" | "kind">) => {
      const apptTime = new Date(payload.appointmentStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      pushNotification(
        { ...payload, kind: "check_in" },
        "BetterYou — Patient Arrived",
        `${payload.patientName} has arrived for the ${apptTime} ${payload.appointmentTitle}`,
      );
    };

    const handleAppointmentUpdated = (payload: {
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
    };

    socket.on("patientCheckedIn", handlePatientCheckedIn);
    socket.on("appointmentUpdated", handleAppointmentUpdated);

    return () => {
      socket.off("patientCheckedIn", handlePatientCheckedIn);
      socket.off("appointmentUpdated", handleAppointmentUpdated);
      releaseSocket({ practitionerId });
      socketRef.current = null;
    };
  }, [practitionerId, pushNotification]);

  // Upcoming-appointment reminders — polled client-side, in-app only (no
  // email/SMS delivery). Each appointment can fire each threshold at most
  // once per session; a reload may re-fire an already-passed threshold,
  // which is an acceptable tradeoff for a lightweight, backend-free reminder.
  useEffect(() => {
    if (!practitionerId) return;

    const firedKeys = new Set<string>();
    let patientNames: Record<string, string> = {};

    const loadPatientNames = async () => {
      try {
        const res = await api.get("/patients");
        if (Array.isArray(res.data)) {
          patientNames = Object.fromEntries(
            res.data.map((p: { _id: string; firstName?: string; lastName?: string }) => [
              p._id,
              `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "your patient",
            ]),
          );
        }
      } catch {
        /* silent — reminders fall back to a generic name */
      }
    };

    const checkReminders = async () => {
      try {
        const res = await api.get(`/appointments/practitioner/${practitionerId}`);
        if (!Array.isArray(res.data)) return;
        const now = Date.now();

        for (const appt of res.data as {
          id: string;
          title: string;
          start: string;
          patientId: string;
          status?: string;
        }[]) {
          const status = appt.status?.toLowerCase();
          if (status === "cancelled" || status === "completed" || status === "no_show") continue;

          const diff = new Date(appt.start).getTime() - now;
          if (diff <= 0) continue;

          for (const threshold of REMINDER_THRESHOLDS) {
            const dedupeKey = `${appt.id}:${threshold.key}`;
            const inWindow = diff <= threshold.ms && diff > threshold.ms - REMINDER_WINDOW_MS;
            if (!inWindow || firedKeys.has(dedupeKey)) continue;

            firedKeys.add(dedupeKey);
            const apptTime = new Date(appt.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const name = patientNames[appt.patientId] ?? "your patient";
            pushNotification(
              {
                kind: "appt_reminder",
                appointmentId: appt.id,
                patientName: name,
                appointmentTitle: appt.title,
                appointmentStart: appt.start,
                checkedInAt: new Date().toISOString(),
              },
              "BetterYou — Upcoming Appointment",
              `${appt.title} with ${name} ${threshold.phrase} (${apptTime})`,
            );
          }
        }
      } catch {
        /* silent — reminders just don't fire this cycle */
      }
    };

    loadPatientNames().then(checkReminders);
    const interval = setInterval(checkReminders, REMINDER_POLL_MS);
    return () => clearInterval(interval);
  }, [practitionerId, pushNotification]);

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
      router.push(
        n.kind === "check_in" ? "/waiting-room" : "/appointmentsPractitioner",
      );
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
