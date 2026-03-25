"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

export interface Appointment {
  id: string;
  title: string;
  start: string;
  end: string;
  notes?: string;
  status: string;
  practitionerId: string;
  patientId: string;
}

// Backend shape (Mongo)
interface AppointmentResponse {
  _id?: string;
  id?: string;
  title: string;
  start: string;
  end: string;
  notes?: string;
  status: string;
  practitionerId: string;
  patientId: string;
  deleted?: boolean;
}

export function useAppointments(patientId: string | null) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  // ✅ Normalize backend → frontend
  const normalize = (data: AppointmentResponse[]): Appointment[] => {
    return data.map((a) => ({
      id: a.id || a._id || "",
      title: a.title,
      start: a.start,
      end: a.end,
      notes: a.notes,
      status: a.status,
      practitionerId: a.practitionerId,
      patientId: a.patientId,
    }));
  };

  // ✅ useCallback FIX (no dependency warning)
  const fetchAppointments = useCallback(async () => {
    if (!patientId) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get<AppointmentResponse[]>(
        `/appointments/patient/${patientId}`
      );

      setAppointments(normalize(res.data || []));
    } catch (err) {
      console.error("Fetch appointments error:", err);
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchAppointments();
  }, [fetchAppointments]);

  // WebSocket — live updates
  useEffect(() => {
    if (!patientId) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL!, {
      query: { patientId },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("appointmentUpdated", (data: AppointmentResponse) => {
      const id = data.id || data._id;
      if (!id) return;

      setAppointments((prev) => {
        if (data.deleted) {
          return prev.filter((a) => a.id !== id);
        }

        const exists = prev.find((a) => a.id === id);

        const normalized: Appointment = {
          id,
          title: data.title,
          start: data.start,
          end: data.end,
          notes: data.notes,
          status: data.status,
          practitionerId: data.practitionerId,
          patientId: data.patientId,
        };

        if (exists) {
          return prev.map((a) => (a.id === id ? normalized : a));
        }

        return [normalized, ...prev];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [patientId]);

  return {
    appointments,
    loading,
    refresh: fetchAppointments,
  };
}