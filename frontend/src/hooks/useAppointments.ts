"use client";

import { useEffect, useState, useCallback } from "react";
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

export function useAppointments(patientId: string | null) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await api.get(`/appointments/patient/${patientId}`);
      setAppointments(res.data || []);
    } catch {
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return { appointments, loading, refresh: fetchAppointments };
}
