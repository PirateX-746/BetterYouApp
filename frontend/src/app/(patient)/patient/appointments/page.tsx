"use client";

import { useEffect, useMemo, useState } from "react";
import { Socket } from "socket.io-client";
import { createSocket, socketUrl } from "@/lib/socket";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

type Appointment = {
  id: string;
  title: string;
  start: string;
  end: string;
  notes?: string;
  status: string;
  deleted?: boolean;
};

type FilterType = "all" | "upcoming" | "past" | "cancelled";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);

  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");

  /* ================= FETCH + SOCKET ================= */

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchAppointments = async () => {
      try {
        const res = await api.get(`/appointments/patient/${userId}`);
        setAppointments(res.data || []);
      } catch (err) {
        toast.error("Failed to load appointments");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();

    if (typeof window !== "undefined") {
      console.log('[Patient Appointments] Using socket URL:', socketUrl);
    }
    const socket: Socket = createSocket({ patientId: userId });

    socket.on("appointmentUpdated", (incoming: Appointment) => {
      setAppointments((prev) => {
        if (incoming.deleted) {
          return prev.filter((a) => a.id !== incoming.id);
        }

        const exists = prev.find((a) => a.id === incoming.id);
        if (exists) {
          return prev.map((a) =>
            a.id === incoming.id ? incoming : a
          );
        }

        return [incoming, ...prev];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const now = Date.now();

  const normalizedAppointments = useMemo(
    () =>
      appointments.map((a) => ({
        ...a,
        startTime: new Date(a.start).getTime(),
        endTime: new Date(a.end).getTime(),
        normalizedStatus: a.status.toLowerCase(),
      })),
    [appointments]
  );

  const filteredAppointments = useMemo(() => {
    let filtered = normalizedAppointments;

    if (filter === "upcoming") {
      filtered = filtered.filter((a) => a.startTime > now);
    }

    if (filter === "past") {
      filtered = filtered.filter((a) => a.startTime < now);
    }

    if (filter === "cancelled") {
      filtered = filtered.filter(
        (a) => a.normalizedStatus === "cancelled"
      );
    }

    return filtered.sort((a, b) => b.startTime - a.startTime);
  }, [normalizedAppointments, filter, now]);

  /* ================= MODAL HELPERS ================= */

  const openNewModal = () => {
    setEditingAppointment(null);
    setTitle("");
    setNotes("");
    const defaultStart = new Date();
    defaultStart.setMinutes(defaultStart.getMinutes() + 30);
    const defaultEnd = new Date(defaultStart.getTime() + 60 * 60000);

    setStart(defaultStart.toISOString().slice(0, 16));
    setEnd(defaultEnd.toISOString().slice(0, 16));
    setModalOpen(true);
  };

  const openReschedule = (appt: Appointment) => {
    setEditingAppointment(appt);
    setTitle(appt.title);
    setStart(appt.start.slice(0, 16));
    setEnd(appt.end.slice(0, 16));
    setNotes(appt.notes || "");
    setModalOpen(true);
  };

  /* ================= AUTO END TIME ================= */

  useEffect(() => {
    if (!start) return;

    const startDate = new Date(start);
    const autoEnd = new Date(startDate.getTime() + 60 * 60000);
    setEnd(autoEnd.toISOString().slice(0, 16));
  }, [start]);

  /* ================= OVERLAP CHECK ================= */

  const isOverlapping = (newStart: Date, newEnd: Date) => {
    return normalizedAppointments.some((appt) => {
      if (
        editingAppointment &&
        appt.id === editingAppointment.id
      )
        return false;

      return (
        newStart < new Date(appt.end) &&
        newEnd > new Date(appt.start)
      );
    });
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async () => {
    if (!title || !start || !end) {
      toast.error("All required fields must be filled");
      return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (startDate < new Date()) {
      toast.error("Cannot select past time");
      return;
    }

    if (endDate <= startDate) {
      toast.error("End must be after start");
      return;
    }

    if (isOverlapping(startDate, endDate)) {
      toast.error("Time overlaps with another appointment");
      return;
    }

    const payload = {
      title,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      notes,
    };

    try {
      if (editingAppointment) {
        await api.put(
          `/appointments/${editingAppointment.id}`,
          payload
        );
        toast.success("Appointment updated");
      } else {
        await api.post(`/appointments`, payload);
        toast.success("Appointment created");
      }

      setModalOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Operation failed";
      toast.error(msg);
    }
  };

  /* ================= UI ================= */

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-8 p-2">

      <div className="flex justify-between items-center bg-bg-card p-6 rounded-lg border border-border">
        <h1 className="text-2xl font-semibold text-text-primary">
          Appointments
        </h1>

        <button
          onClick={openNewModal}
          className="btn btn-primary"
        >
          + New Appointment
        </button>
      </div>

      <div className="space-y-4">
        {filteredAppointments.map((appt) => {
          const isUpcoming =
            appt.startTime > now &&
            appt.normalizedStatus !== "cancelled";

          return (
            <div
              key={appt.id}
              className="bg-white border border-gray-200 rounded-md p-5 flex justify-between items-center"
            >
              <div>
                <p className="font-medium">{appt.title}</p>
                <p className="text-sm text-gray-500">
                  {new Date(appt.startTime).toLocaleString()}
                </p>
              </div>

              <div className="flex gap-3 items-center">
                <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 capitalize">
                  {appt.normalizedStatus}
                </span>

                {isUpcoming && (
                  <button
                    onClick={() => openReschedule(appt)}
                    className="text-sm text-[#2563EB] hover:underline"
                  >
                    Reschedule
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-md p-6 w-full max-w-md space-y-5 shadow-lg">

            <h2 className="text-lg font-semibold">
              {editingAppointment
                ? "Reschedule Appointment"
                : "New Appointment"}
            </h2>

            <input
              type="text"
              placeholder="Title"
              className="w-full border border-gray-200 p-2 rounded-md"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <input
              type="datetime-local"
              min={new Date().toISOString().slice(0, 16)}
              className="w-full border border-gray-200 p-2 rounded-md"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />

            <input
              type="datetime-local"
              className="w-full border border-gray-200 p-2 rounded-md"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />

            <textarea
              placeholder="Notes (optional)"
              className="w-full border border-gray-200 p-2 rounded-md resize-none"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-gray-200 rounded-md text-sm"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-[#2563EB] text-white rounded-md text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}