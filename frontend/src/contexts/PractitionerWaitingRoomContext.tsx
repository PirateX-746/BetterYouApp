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
import { api } from "@/lib/api";
import { acquireSocket, releaseSocket } from "@/lib/useAppSocket";

interface WaitingRoomCtx {
  waitingCount: number;
}

const WaitingRoomContext = createContext<WaitingRoomCtx>({
  waitingCount: 0,
});

export function PractitionerWaitingRoomProvider({ children }: { children: ReactNode }) {
  const [practitionerId, setPractitionerId] = useState<string | null>(null);
  const [waitingCount, setWaitingCount] = useState(0);
  const socketRef = useRef<ReturnType<typeof acquireSocket> | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPractitionerId(localStorage.getItem("userId"));
    }
  }, []);

  const fetchWaitingCount = useCallback(async (id: string) => {
    try {
      const res = await api.get(`/appointments/waiting-room/${id}`);
      const list = Array.isArray(res.data) ? res.data : [];
      setWaitingCount(
        list.filter((p: { status: string }) => p.status === "checked_in").length,
      );
    } catch {
      /* silent — badge just stays at its last known value */
    }
  }, []);

  useEffect(() => {
    if (practitionerId) fetchWaitingCount(practitionerId);
  }, [practitionerId, fetchWaitingCount]);

  useEffect(() => {
    if (!practitionerId) return;
    const socket = acquireSocket({ practitionerId });
    socketRef.current = socket;

    const handlePatientCheckedIn = () => fetchWaitingCount(practitionerId);
    const handleAppointmentUpdated = () => fetchWaitingCount(practitionerId);
    socket.on("patientCheckedIn", handlePatientCheckedIn);
    socket.on("appointmentUpdated", handleAppointmentUpdated);

    return () => {
      socket.off("patientCheckedIn", handlePatientCheckedIn);
      socket.off("appointmentUpdated", handleAppointmentUpdated);
      releaseSocket({ practitionerId });
      socketRef.current = null;
    };
  }, [practitionerId, fetchWaitingCount]);

  return (
    <WaitingRoomContext.Provider value={{ waitingCount }}>
      {children}
    </WaitingRoomContext.Provider>
  );
}

export const usePractitionerWaitingRoom = () => useContext(WaitingRoomContext);
