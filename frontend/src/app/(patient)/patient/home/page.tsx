"use client";

import { useEffect, useMemo, useState } from "react";
import { Socket } from "socket.io-client";
import { createSocket, socketUrl } from "@/lib/socket";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Calendar } from "lucide-react";

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

    if (typeof window !== "undefined") {
      console.log('[Patient Home] Using socket URL:', socketUrl);
    }

    // WebSocket connection
    const newSocket = createSocket({ patientId: userId });

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
      <div className="flex h-full items-center justify-center text-text-secondary">
        <p className="animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 p-2">

      <h1 className="text-2xl font-semibold text-text-primary">
        Dashboard
      </h1>

      {/* Next Appointment */}
      <div className="bg-bg-card border border-border shadow-sm rounded-lg p-6 transition-all hover:shadow-md">
        <h2 className="text-lg font-medium mb-4 text-text-primary flex items-center gap-2">
          Next Appointment
        </h2>

        {!nextAppointment ? (
          <div className="text-center py-6 text-text-secondary">
            <p>No upcoming appointments.</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-5">
              <p className="text-base font-semibold text-primary">
                {nextAppointment.title}
              </p>
              <p className="text-sm text-text-secondary mt-1 flex items-center gap-2">
                <Calendar size={14} className="opacity-70" />
                {new Date(
                  nextAppointment.startTime
                ).toLocaleString()}
              </p>
              <p className="text-sm capitalize mt-2 flex items-center gap-2">
                <span className="font-medium text-text-primary">Status:</span>{" "}
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success-light text-success">
                  {nextAppointment.normalizedStatus}
                </span>
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
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover transition shadow-sm disabled:opacity-50"
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
                  className="flex-1 sm:flex-none px-5 py-2.5 border border-danger text-danger text-sm font-medium rounded-md hover:bg-danger/10 transition disabled:opacity-50"
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