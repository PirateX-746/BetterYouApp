"use client";

import { useEffect, useState } from "react";
import { useAppointments } from "./useAppointments";
import PatientBookingFlow from "./PatientBookingFlow";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

export interface Practitioner {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function AppointmentsPage() {
  const [patientId, setPatientId] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (id) setPatientId(id);
  }, []);

  const { appointments, loading, refresh } =
    useAppointments(patientId);

  useEffect(() => {
    const fetchPractitioners = async () => {
      try {
        const res = await api.get("/practitioners");
        setPractitioners(res.data || []);
      } catch {
        toast.error("Failed to load practitioners");
      }
    };

    fetchPractitioners();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">
          My Appointments
        </h1>

        <button
          onClick={() => setBookingOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg"
        >
          + Book Appointment
        </button>
      </div>

      {appointments.length === 0 ? (
        <p className="text-gray-500">
          No appointments yet.
        </p>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => (
            <div
              key={appt.id}
              className="border p-4 rounded-lg flex justify-between"
            >
              <div>
                <p className="font-medium">{appt.title}</p>
                <p className="text-sm text-gray-500">
                  {new Date(appt.start).toLocaleString()}
                </p>
              </div>

              <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 capitalize">
                {appt.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {bookingOpen && (
        <PatientBookingFlow
          practitioners={practitioners}
          onClose={() => setBookingOpen(false)}
          onBookingComplete={() => {
            refresh();
            setBookingOpen(false);
          }}
        />
      )}
    </div>
  );
}