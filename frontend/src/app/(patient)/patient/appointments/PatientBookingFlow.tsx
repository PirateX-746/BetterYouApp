"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

type Step = 1 | 2 | 3;

interface Slot {
  start: string;
  end: string;
}

interface Practitioner {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Props {
  practitioners: Practitioner[];
  onClose: () => void;
  onBookingComplete: () => void;
}

const appointmentTypes = [
  "New Patient Visit",
  "Counselling Session",
  "Follow-Up Session",
  "CBT Session",
  "Couples Therapy",
  "Family Therapy",
];

/* ================= STEP INDICATOR ================= */

function StepIndicator({ step }: { step: Step }) {
  const progress = (step - 1) / 2;
  const labels = ["Details", "Date & Time", "Confirm"];

  return (
    <div className="relative flex items-center justify-between mb-12 px-6">
      <div
        className="absolute top-6 h-1 bg-gray-200 rounded-full"
        style={{ left: 40, right: 40 }}
      />

      <motion.div
        className="absolute top-6 h-1 bg-blue-600 rounded-full"
        style={{ left: 40 }}
        animate={{
          width: `calc(${progress} * (100% - 80px))`,
        }}
        transition={{ duration: 0.4 }}
      />

      {[1, 2, 3].map((num, index) => {
        const isCompleted = step > num;
        const isActive = step === num;

        return (
          <div key={num} className="relative z-10 flex flex-col items-center">
            <div
              className={`w-12 h-12 flex items-center justify-center rounded-full font-semibold
                ${isCompleted
                  ? "bg-green-600 text-white"
                  : isActive
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
            >
              {isCompleted ? "✓" : num}
            </div>

            <span className="mt-3 text-sm font-medium text-gray-600">
              {labels[index]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ================= MAIN COMPONENT ================= */

export default function PatientBookingFlow({
  practitioners,
  onClose,
  onBookingComplete,
}: Props) {
  const [step, setStep] = useState<Step>(1);

  const [selectedPractitioner, setSelectedPractitioner] =
    useState<Practitioner | null>(null);
  const [selectedType, setSelectedType] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const fetchSlots = async (date: string) => {
    if (!selectedPractitioner) return;

    try {
      setSlotsLoading(true);

      const res = await api.get("/appointments/availability", {
        params: {
          practitionerId: selectedPractitioner._id,
          date,
        },
      });

      setSlots(res.data || []);
    } catch {
      toast.error("Failed to load slots");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const confirmBooking = async () => {
    if (!selectedSlot || !selectedPractitioner) return;

    const patientId = localStorage.getItem("userId");
    if (!patientId) {
      toast.error("Login required");
      return;
    }

    try {
      setBookingLoading(true);

      await api.post("/appointments", {
        title: selectedType,
        patientId,
        practitionerId: process.env.NEXT_PUBLIC_PRACTITIONER_ID,
        start: selectedSlot.start,
        end: selectedSlot.end,
      });

      toast.success("Appointment booked 🎉");
      onBookingComplete();
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Slot already booked"
      );
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-xl relative max-h-[90vh] overflow-y-auto p-6 md:p-8">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400"
        >
          ✕
        </button>

        <StepIndicator step={step} />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >

            {/* STEP 1 — Practitioner + Type */}
            {step === 1 && (
              <>
                <h2 className="text-xl font-semibold mb-6">
                  Select Practitioner
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  {practitioners.map((p) => (
                    <div
                      key={p._id}
                      onClick={() => setSelectedPractitioner(p)}
                      className={`border-2 p-4 rounded-lg cursor-pointer transition ${selectedPractitioner?._id === p._id
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-blue-400"
                        }`}
                    >
                      <div className="font-semibold">
                        {p.firstName} {p.lastName}
                      </div>
                    </div>
                  ))}
                </div>

                <h2 className="text-xl font-semibold mb-6">
                  Select Appointment Type
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  {appointmentTypes.map((type) => (
                    <div
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`border-2 p-4 rounded-lg cursor-pointer transition ${selectedType === type
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-blue-400"
                        }`}
                    >
                      {type}
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    disabled={!selectedPractitioner || !selectedType}
                    onClick={() => setStep(2)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </>
            )}

            {/* STEP 2 — Date & Time */}
            {step === 2 && (
              <>
                <h2 className="text-xl font-semibold mb-6">
                  Choose Date & Time
                </h2>

                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={selectedDate}
                  onChange={(e) => {
                    const date = e.target.value;
                    setSelectedDate(date);
                    setSelectedSlot(null);
                    fetchSlots(date);
                  }}
                  className="border p-3 rounded-lg w-full mb-6"
                />

                {slotsLoading ? (
                  <p>Loading slots...</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {slots.map((slot) => (
                      <button
                        key={slot.start}
                        onClick={() => setSelectedSlot(slot)}
                        className={`px-4 py-2 rounded-full border ${selectedSlot?.start === slot.start
                          ? "bg-green-600 text-white border-green-600"
                          : "border-gray-200 hover:border-green-600"
                          }`}
                      >
                        {new Date(slot.start).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-8 flex justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="border px-6 py-2 rounded-lg"
                  >
                    Back
                  </button>

                  <button
                    disabled={!selectedSlot}
                    onClick={() => setStep(3)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </>
            )}

            {/* STEP 3 — Confirm */}
            {step === 3 && selectedSlot && selectedPractitioner && (
              <>
                <h2 className="text-xl font-semibold mb-6">
                  Confirm Appointment
                </h2>

                <div className="bg-gray-50 p-6 rounded-lg space-y-3">
                  <p>
                    <strong>Practitioner:</strong>{" "}
                    {selectedPractitioner.firstName}{" "}
                    {selectedPractitioner.lastName}
                  </p>
                  <p><strong>Type:</strong> {selectedType}</p>
                  <p>
                    <strong>Date:</strong>{" "}
                    {new Date(selectedSlot.start).toLocaleString()}
                  </p>
                </div>

                <div className="mt-8 flex justify-between">
                  <button
                    onClick={() => setStep(2)}
                    className="border px-6 py-2 rounded-lg"
                  >
                    Back
                  </button>

                  <button
                    onClick={confirmBooking}
                    disabled={bookingLoading}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg"
                  >
                    {bookingLoading ? "Booking..." : "Confirm Booking"}
                  </button>
                </div>
              </>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}