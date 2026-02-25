"use client";

import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

type Appointment = {
  id: string;
  title: string;
  start: string;
  end: string;
  practitionerId: string;
  patientId: string;
  status: string;
  createdAt?: string; // IMPORTANT for 48h logic
};

const HOURS_24 = 24 * 60 * 60 * 1000;
const HOURS_48 = 48 * 60 * 60 * 1000;
const HOURS_2 = 2 * 60 * 60 * 1000;

export default function HomePage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  /* ---------------- FETCH ---------------- */

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
        console.error(err);
        toast.error("Failed to load appointments");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();

    // WebSocket connection
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
      query: { patientId: userId },
    });

    newSocket.on("appointmentUpdated", (incoming: Appointment) => {
      setAppointments((prev) => {
        const exists = prev.find((a) => a.id === incoming.id);
        if (exists) {
          return prev.map((a) =>
            a.id === incoming.id ? incoming : a
          );
        }
        return [incoming, ...prev];
      });

      toast.success("Appointment updated");
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  /* ---------------- DERIVED ---------------- */

  const now = Date.now();

  const normalizedAppointments = useMemo(
    () =>
      appointments.map((a) => ({
        ...a,
        normalizedStatus: a.status.toLowerCase(),
        startTime: new Date(a.start).getTime(),
        createdTime: a.createdAt
          ? new Date(a.createdAt).getTime()
          : 0,
      })),
    [appointments]
  );

  const upcomingAppointments = normalizedAppointments
    .filter((a) => a.startTime > now)
    .sort((a, b) => a.startTime - b.startTime);

  const nextAppointment = upcomingAppointments[0];

  const timeUntilNext =
    nextAppointment?.startTime
      ? nextAppointment.startTime - now
      : 0;

  const timeSinceCreated =
    nextAppointment?.createdTime
      ? now - nextAppointment.createdTime
      : 0;

  const isWithin24Hours =
    timeUntilNext > 0 && timeUntilNext <= HOURS_24;

  const canConfirm =
    nextAppointment &&
    isWithin24Hours &&
    nextAppointment.normalizedStatus === "scheduled";

  /* ---------------- AUTO CANCEL LOGIC ---------------- */

  useEffect(() => {
    if (!nextAppointment) return;

    const shouldAutoCancel =
      nextAppointment.normalizedStatus === "scheduled" &&
      timeUntilNext <= HOURS_2 &&
      timeSinceCreated >= HOURS_48;

    if (shouldAutoCancel) {
      updateStatus(nextAppointment.id, "CANCELLED");
      toast("Appointment auto-cancelled", {
        icon: "⚠️",
      });
    }
  }, [nextAppointment]);

  /* ---------------- UPDATE STATUS ---------------- */

  const updateStatus = async (
    id: string,
    status: "CONFIRMED" | "CANCELLED"
  ) => {
    try {
      setUpdatingId(id);

      await api.put(`/appointments/${id}`, { status });

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status } : a
        )
      );

      toast.success(
        status === "CONFIRMED"
          ? "Appointment confirmed"
          : "Appointment cancelled"
      );
    } catch (err) {
      toast.error("Failed to update appointment");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-gray-600">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen">

      <h1 className="text-2xl font-semibold text-[#111827]">
        Dashboard
      </h1>

      {/* Next Appointment */}
      <div className="bg-white border border-gray-200 rounded-md p-6">
        <h2 className="text-base font-medium mb-4 text-[#111827]">
          Next Appointment
        </h2>

        {!nextAppointment ? (
          <p className="text-gray-500">
            No upcoming appointments.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-md p-4">
              <p className="text-sm font-medium text-[#2563EB]">
                {nextAppointment.title}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {new Date(
                  nextAppointment.startTime
                ).toLocaleString()}
              </p>
              <p className="text-xs capitalize mt-1">
                Status:{" "}
                {nextAppointment.normalizedStatus}
              </p>
            </div>

            {canConfirm && (
              <div className="flex gap-3">
                <button
                  disabled={updatingId === nextAppointment.id}
                  onClick={() =>
                    updateStatus(
                      nextAppointment.id,
                      "CONFIRMED"
                    )
                  }
                  className="px-4 py-2 bg-[#2563EB] text-white text-sm rounded-md hover:bg-[#1D4ED8] transition disabled:opacity-50"
                >
                  Confirm
                </button>

                <button
                  disabled={updatingId === nextAppointment.id}
                  onClick={() =>
                    updateStatus(
                      nextAppointment.id,
                      "CANCELLED"
                    )
                  }
                  className="px-4 py-2 border border-red-300 text-red-600 text-sm rounded-md hover:bg-red-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}