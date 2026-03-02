"use client";

import { useEffect, useMemo, useState } from "react";
import { Socket } from "socket.io-client";
import { createSocket, socketUrl } from "@/lib/socket";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Calendar, Plus, CheckCircle, Clock, TrendingUp } from "lucide-react";
import Link from "next/link";

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

const MOTIVATIONAL_QUOTES = [
  "Your health is your wealth. Every step forward counts.",
  "Progress, not perfection. You're doing great!",
  "Take care of your body. It's the only place you have to live.",
  "Small consistent actions lead to big changes.",
  "You have the power to heal yourself. Believe in it.",
  "Invest in your wellness today for a better tomorrow.",
  "Your health journey is unique. Celebrate your wins.",
  "Wellness is a perfect synergy of mind, body, and spirit.",
  "You are stronger than you think. Keep going!",
  "Health is a journey, not a destination. Enjoy the process.",
];

export default function HomePage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [randomQuote, setRandomQuote] = useState("");

  /* ---------------- FETCH ---------------- */

  useEffect(() => {
    // Set random motivational quote
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    setRandomQuote(MOTIVATIONAL_QUOTES[randomIndex]);

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
      console.log("[Patient Home] Using socket URL:", socketUrl);
    }

    // WebSocket connection
    const newSocket = createSocket({ patientId: userId });

    newSocket.on("appointmentUpdated", (incoming: Appointment) => {
      setAppointments((prev) => {
        const exists = prev.find((a) => a.id === incoming.id);
        if (exists) {
          return prev.map((a) => (a.id === incoming.id ? incoming : a));
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
        createdTime: a.createdAt ? new Date(a.createdAt).getTime() : 0,
      })),
    [appointments],
  );

  const upcomingAppointments = normalizedAppointments
    .filter((a) => a.startTime > now)
    .sort((a, b) => a.startTime - b.startTime);

  const nextAppointment = upcomingAppointments[0];

  const completedAppointments = normalizedAppointments.filter(
    (a) => a.startTime <= now && a.normalizedStatus === "confirmed",
  ).length;

  const totalAppointments = appointments.length;
  const upcomingCount = upcomingAppointments.length;

  const timeUntilNext = nextAppointment?.startTime
    ? nextAppointment.startTime - now
    : 0;

  const timeSinceCreated = nextAppointment?.createdTime
    ? now - nextAppointment.createdTime
    : 0;

  const isWithin24Hours = timeUntilNext > 0 && timeUntilNext <= HOURS_24;

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
    status: "CONFIRMED" | "CANCELLED",
  ) => {
    try {
      setUpdatingId(id);

      await api.put(`/appointments/${id}`, { status });

      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a)),
      );

      toast.success(
        status === "CONFIRMED"
          ? "Appointment confirmed"
          : "Appointment cancelled",
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
    <div className="w-full min-h-screen bg-bg-primary">
      <div className="space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-8 px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6 pt-6 sm:pt-8 md:pt-10 max-w-7xl mx-auto">
        {/* Motivational Quote Banner */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4 sm:p-5 md:p-6 lg:p-8 shadow-sm">
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-primary leading-relaxed italic">
            "{randomQuote}"
          </p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
          {/* Total Appointments */}
          <div className="bg-bg-card border border-border rounded-lg p-4 sm:p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs sm:text-sm font-medium text-text-secondary">
                Total Appointments
              </h3>
              <TrendingUp size={16} className="sm:w-5 sm:h-5 text-primary opacity-70" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-text-primary">
              {totalAppointments}
            </p>
            <p className="text-xs text-text-secondary mt-2">All time</p>
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-bg-card border border-border rounded-lg p-4 sm:p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs sm:text-sm font-medium text-text-secondary">
                Upcoming
              </h3>
              <Clock size={16} className="sm:w-5 sm:h-5 text-warning opacity-70" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-text-primary">
              {upcomingCount}
            </p>
            <p className="text-xs text-text-secondary mt-2">Scheduled</p>
          </div>

          {/* Completed Appointments */}
          <div className="bg-bg-card border border-border rounded-lg p-4 sm:p-5 shadow-sm hover:shadow-md transition sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs sm:text-sm font-medium text-text-secondary">
                Completed
              </h3>
              <CheckCircle size={16} className="sm:w-5 sm:h-5 text-success opacity-70" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-text-primary">
              {completedAppointments}
            </p>
            <p className="text-xs text-text-secondary mt-2">Finished</p>
          </div>
        </div>

        {/* Next Appointment Section */}
        <div className="bg-bg-card border border-border shadow-sm rounded-lg p-4 sm:p-5 md:p-6 transition-all hover:shadow-md">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-4 text-text-primary flex items-center gap-2">
            <Calendar size={20} className="text-primary flex-shrink-0" />
            <span>Next Appointment</span>
          </h2>

          {!nextAppointment ? (
            <div className="text-center py-6 sm:py-8">
              <Calendar
                size={36}
                className="sm:w-10 sm:h-10 mx-auto text-text-secondary opacity-40 mb-4"
              />
              <p className="text-base sm:text-lg text-text-primary font-medium mb-2 sm:mb-4">
                No upcoming appointments
              </p>
              <p className="text-xs sm:text-sm text-text-secondary mb-4 sm:mb-6 px-2">
                Schedule your first appointment to get started on your health journey
              </p>
              <Link
                href="/patient/appointments"
                className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-primary text-white text-xs sm:text-sm font-medium rounded-md hover:bg-primary-hover transition shadow-sm active:scale-95"
              >
                <Plus size={18} className="flex-shrink-0" />
                <span>Book Appointment</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-5">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 sm:p-5">
                <p className="text-sm sm:text-base font-semibold text-primary mb-2 sm:mb-3 break-words">
                  {nextAppointment.title}
                </p>
                <p className="text-xs sm:text-sm text-text-secondary flex items-start sm:items-center gap-2 mb-2">
                  <Calendar size={14} className="flex-shrink-0 mt-0.5 sm:mt-0 opacity-70" />
                  <span className="break-words">
                    {new Date(nextAppointment.startTime).toLocaleString()}
                  </span>
                </p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="font-medium text-xs sm:text-sm text-text-primary">
                    Status:
                  </span>
                  <span className="px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold bg-success-light text-success capitalize">
                    {nextAppointment.normalizedStatus}
                  </span>
                </div>
              </div>

              {canConfirm && (
                <div className="flex flex-col gap-2 sm:gap-3">
                  <button
                    disabled={updatingId === nextAppointment.id}
                    onClick={() => updateStatus(nextAppointment.id, "CONFIRMED")}
                    className="w-full px-4 sm:px-5 py-2 sm:py-2.5 bg-primary text-white text-xs sm:text-sm font-medium rounded-md hover:bg-primary-hover transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    {updatingId === nextAppointment.id
                      ? "Confirming..."
                      : "Confirm"}
                  </button>

                  <button
                    disabled={updatingId === nextAppointment.id}
                    onClick={() => updateStatus(nextAppointment.id, "CANCELLED")}
                    className="w-full px-4 sm:px-5 py-2 sm:py-2.5 border border-danger text-danger text-xs sm:text-sm font-medium rounded-md hover:bg-danger/10 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    {updatingId === nextAppointment.id
                      ? "Cancelling..."
                      : "Cancel"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
