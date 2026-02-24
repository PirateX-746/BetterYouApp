"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { api } from "@/lib/api";
import GlassCard from "@/components/GlassCard";

type Appointment = {
  id: string;
  title: string;
  start: string;
  end: string;
  practitionerId: string;
  patientId: string;
  status: string;
  deleted?: boolean;
};

const mindfulThoughts = [
  "Small steps every day create big change.",
  "Your health is your real wealth.",
  "Breathe in calm. Breathe out stress.",
  "Consistency beats intensity.",
  "You deserve care and balance.",
];

export default function HomePage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientName, setPatientName] = useState("");
  const [greeting, setGreeting] = useState("");
  const [thought, setThought] = useState("");

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const name = localStorage.getItem("name");

    if (!userId) return;

    if (name) setPatientName(name);

    // 🔹 Set greeting safely (client only)
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    // 🔹 Set random thought safely
    const random =
      mindfulThoughts[
      Math.floor(Math.random() * mindfulThoughts.length)
      ];
    setThought(random);

    // 🔹 Initial fetch
    const fetchAppointments = async () => {
      try {
        const res = await api.get(`/appointments/patient/${userId}`);
        setAppointments(res.data);
      } catch (error) {
        console.error("Failed to fetch appointments:", error);
      }
    };

    fetchAppointments();

    // 🔹 WebSocket
    const socket: Socket = io("http://localhost:3001", {
      query: { patientId: userId },
    });

    socket.on("appointmentUpdated", (incoming: Appointment) => {
      setAppointments((prev) => {
        if (incoming.deleted) {
          return prev.filter((appt) => appt.id !== incoming.id);
        }

        const exists = prev.find((appt) => appt.id === incoming.id);

        if (exists) {
          return prev.map((appt) =>
            appt.id === incoming.id ? incoming : appt
          );
        }

        return [incoming, ...prev];
      });
    });

    return () => {
      socket.disconnect(); // ✅ correct cleanup
    };
  }, []);

  const now = new Date();

  const todayAppointments = appointments.filter((appt) => {
    const date = new Date(appt.start);
    return date.toDateString() === now.toDateString();
  });

  const upcomingAppointments = appointments.filter(
    (appt) => new Date(appt.start) > now
  );

  const recentAppointments = appointments.filter(
    (appt) => new Date(appt.start) < now
  );

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.put(`/appointments/${id}`, { status });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  return (
    <div className="space-y-8">

      {/* Greeting */}
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">
          {greeting && `Hi ${patientName} 👋 ${greeting}`}
        </h1>
        {thought && (
          <p className="text-gray-500 mt-2 italic">"{thought}"</p>
        )}
      </div>

      {/* ================= STATS ================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard>
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-semibold">
            {appointments.length}
          </p>
        </GlassCard>

        <GlassCard>
          <p className="text-sm text-gray-500">Upcoming</p>
          <p className="text-2xl font-semibold">
            {upcomingAppointments.length}
          </p>
        </GlassCard>

        <GlassCard>
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-semibold">
            {appointments.filter(a => a.status === "completed").length}
          </p>
        </GlassCard>

        <GlassCard>
          <p className="text-sm text-gray-500">Cancelled</p>
          <p className="text-2xl font-semibold">
            {appointments.filter(a => a.status === "cancelled").length}
          </p>
        </GlassCard>
      </div>

      {/* ================= NEXT APPOINTMENT ================= */}
      {upcomingAppointments.length > 0 ? (
        <GlassCard>
          <h2 className="text-lg font-semibold mb-4">
            Your Next Appointment
          </h2>

          {(() => {
            const next = upcomingAppointments.sort(
              (a, b) =>
                new Date(a.start).getTime() -
                new Date(b.start).getTime()
            )[0];

            return (
              <div className="space-y-2">
                <p className="text-xl font-semibold text-blue-600">
                  {next.title}
                </p>
                <p className="text-gray-500">
                  {new Date(next.start).toLocaleString()}
                </p>

                <div className="flex gap-3 mt-4">
                  <button className="bg-blue-500 text-white px-4 py-2 rounded-xl text-sm">
                    View Details
                  </button>

                  <button className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm">
                    Add to Calendar
                  </button>
                </div>
              </div>
            );
          })()}
        </GlassCard>
      ) : (
        <GlassCard>
          <p className="text-gray-500">
            No upcoming appointments scheduled.
          </p>
        </GlassCard>
      )}

      {/* ================= QUICK ACTIONS ================= */}
      <GlassCard>
        <h2 className="text-lg font-semibold mb-4">
          Quick Actions
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button className="bg-blue-500 text-white py-3 rounded-xl">
            Book Appointment
          </button>

          <button className="bg-white border border-blue-100 py-3 rounded-xl">
            Message Doctor
          </button>

          <button className="bg-white border border-blue-100 py-3 rounded-xl">
            View Records
          </button>
        </div>
      </GlassCard>

      {/* ================= RECENT ACTIVITY ================= */}
      {recentAppointments.length > 0 && (
        <GlassCard>
          <h2 className="text-lg font-semibold mb-4">
            Recent Activity
          </h2>

          {recentAppointments.slice(0, 3).map((appt) => (
            <div
              key={appt.id}
              className="border-b border-gray-100 py-3 last:border-none"
            >
              <p className="font-medium">{appt.title}</p>
              <p className="text-sm text-gray-500">
                {new Date(appt.start).toLocaleString()}
              </p>
            </div>
          ))}
        </GlassCard>
      )}
    </div>
  );
}