"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

type Step = "calendar" | "slots" | "reason" | "review" | "success";

interface Slot {
  start: string;
  end: string;
}

interface Props {
  practitionerId: string;
  onClose: () => void;
  onBookingComplete: () => void;
}

export default function PatientBookingFlow({
  practitionerId,
  onClose,
  onBookingComplete,
}: Props) {
  const [step, setStep] = useState<Step>("calendar");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  /* ================= FETCH AVAILABILITY ================= */

  const fetchAvailability = async (date: string) => {
    setLoading(true);

    try {
      const res = await api.get("/appointments/availability", {
        params: {
          practitionerId,
          date,
        },
      });

      setSlots(res.data || []);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= BOOK ================= */

  const confirmBooking = async () => {
    if (!selectedSlot || !reason.trim()) return;

    setLoading(true);

    try {
      await api.post("/appointments", {
        practitionerId,
        start: selectedSlot.start,
        end: selectedSlot.end,
        reason,
      });

      setStep("success");
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
        "Slot already booked. Please choose another."
      );
      setStep("calendar");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  const Modal = ({ children }: { children: React.ReactNode }) => (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-xl w-full max-w-2xl shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-black text-xl"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );

  return (
    <Modal>
      {step === "calendar" && (
        <>
          <h2 className="text-xl font-semibold mb-4">Select Date</h2>

          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            validRange={{
              start: new Date().toISOString().split("T")[0],
            }}
            dateClick={(info) => {
              const date = info.dateStr;
              setSelectedDate(date);
              fetchAvailability(date);
              setStep("slots");
            }}
          />
        </>
      )}

      {step === "slots" && (
        <>
          <div className="flex justify-between mb-6">
            <h2 className="text-xl font-semibold">Available Time Slots</h2>
            <button onClick={() => setStep("calendar")} className="text-primary">
              ← Back
            </button>
          </div>

          {loading ? (
            <p className="text-center py-6">Loading...</p>
          ) : slots.length === 0 ? (
            <p className="text-center py-6 text-gray-500">
              No available slots
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {slots.map((slot) => (
                <button
                  key={slot.start}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setStep("reason");
                  }}
                  className="px-4 py-2 rounded-full border hover:border-primary hover:bg-blue-50 transition"
                >
                  {new Date(slot.start).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {step === "reason" && (
        <>
          <h2 className="text-xl font-semibold mb-4">Reason for Visit</h2>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border p-3 rounded-lg"
            rows={4}
          />

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep("slots")}
              className="flex-1 border rounded-lg py-2"
            >
              Back
            </button>
            <button
              onClick={() => setStep("review")}
              disabled={!reason.trim()}
              className="flex-1 bg-primary text-white rounded-lg py-2"
            >
              Continue
            </button>
          </div>
        </>
      )}

      {step === "review" && selectedSlot && (
        <>
          <h2 className="text-xl font-semibold mb-4">
            Confirm Appointment
          </h2>

          <div className="space-y-3 mb-6">
            <p>
              <strong>Date:</strong> {selectedDate}
            </p>
            <p>
              <strong>Time:</strong>{" "}
              {new Date(selectedSlot.start).toLocaleTimeString()}
            </p>
            <p>
              <strong>Reason:</strong> {reason}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("reason")}
              className="flex-1 border rounded-lg py-2"
            >
              Back
            </button>
            <button
              onClick={confirmBooking}
              disabled={loading}
              className="flex-1 bg-primary text-white rounded-lg py-2"
            >
              {loading ? "Booking..." : "Confirm"}
            </button>
          </div>
        </>
      )}

      {step === "success" && (
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">
            Appointment Booked Successfully 🎉
          </h2>

          <button
            onClick={() => {
              onBookingComplete();
              onClose();
            }}
            className="bg-primary text-white px-6 py-2 rounded-lg"
          >
            View My Appointments
          </button>
        </div>
      )}
    </Modal>
  );
}