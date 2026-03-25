"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ChevronLeft, ChevronRight, CalendarX } from "lucide-react";

type Step = 1 | 2 | 3;

interface AvailabilitySlot {
  _id: string;
  practitionerId: string;
  start: string;
  end: string;
  isBooked: boolean;
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

const APPOINTMENT_TYPES = [
  "New Patient Visit",
  "Counselling Session",
  "Follow-Up Session",
  "CBT Session",
  "Couples Therapy",
  "Family Therapy",
];

const STEP_LABELS = ["Details", "Date & Time", "Confirm"];

/* ─────────────────────────────────────────────
   Step indicator — horizontally centred
───────────────────────────────────────────── */
function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3].map((num, i) => {
        const done = step > num;
        const active = step === num;
        return (
          <div key={num} className="flex items-center">
            {/* Circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-300
                  ${done ? "bg-success text-white" : active ? "bg-primary text-white" : "bg-bg-hover text-text-disabled"}`}
              >
                {done ? <Check size={16} /> : num}
              </div>
              <span
                className={`text-[11px] font-medium whitespace-nowrap ${active ? "text-text-primary" : "text-text-disabled"}`}
              >
                {STEP_LABELS[i]}
              </span>
            </div>

            {/* Connector line between steps */}
            {i < 2 && (
              <div className="w-16 sm:w-24 h-px bg-border mx-2 mb-4 overflow-hidden shrink-0">
                <motion.div
                  className="h-full bg-primary origin-left"
                  animate={{ scaleX: step > num ? 1 : 0 }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Safe date helpers — guard against bad values
───────────────────────────────────────────── */
function safeDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? null : d;
}

function formatTime(iso: string): string {
  const d = safeDate(iso);
  if (!d) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(iso: string): string {
  const d = safeDate(iso);
  if (!d) return "—";
  return d.toLocaleString([], {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(slot: AvailabilitySlot): string {
  const s = safeDate(slot.start);
  const e = safeDate(slot.end);
  if (!s || !e) return "—";
  const mins = (e.getTime() - s.getTime()) / 60_000;
  if (mins <= 0) return "—";
  return mins >= 60 ? `${mins / 60}h` : `${mins} min`;
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
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
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(
    null,
  );
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  /* ── Fetch + filter slots ── */
  const fetchSlots = async (date: string, practitioner: Practitioner) => {
    setSlotsLoading(true);
    setAvailableSlots([]);
    setSelectedSlot(null);

    try {
      const res = await api.get("/appointments/availability", {
        params: {
          practitionerId: practitioner._id,
          date,
        },
      });

      const allSlots = Array.isArray(res.data) ? res.data : [];

      console.log("✅ Slots from backend:", allSlots);

      const filtered = allSlots.filter((slot) => {
        const slotStart = safeDate(slot.start);
        return slotStart && !slot.isBooked;
      });

      setAvailableSlots(filtered);
    } catch (err) {
      console.error("❌ Failed:", err);
      toast.error("Failed to load available slots");
    } finally {
      setSlotsLoading(false);
    }
  };

  /* ── Confirm booking ── */
  const confirmBooking = async () => {
    if (!selectedSlot || !selectedPractitioner) return;

    const patientId = localStorage.getItem("userId");
    if (!patientId) {
      toast.error("Login required");
      return;
    }

    const startDate = safeDate(selectedSlot.start);
    const endDate = safeDate(selectedSlot.end);
    if (!startDate || !endDate) {
      toast.error("Invalid slot times — please select another slot");
      return;
    }

    setBookingLoading(true);
    try {
      await api.post("/appointments", {
        title: selectedType,
        patientId,
        practitionerId: selectedPractitioner._id,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });

      toast.success("Appointment booked!");
      onBookingComplete();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? "Failed to book appointment");
    } finally {
      setBookingLoading(false);
    }
  };

  const canAdvance =
    (step === 1 && !!selectedPractitioner && !!selectedType) ||
    (step === 2 && !!selectedSlot) ||
    step === 3;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="bg-bg-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92dvh] flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]"
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-text-primary">
            Book Appointment
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-text-secondary hover:text-text-primary p-1.5 rounded-full hover:bg-bg-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <StepIndicator step={step} />

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -30, opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              {/* ── STEP 1 — Practitioner + Type ── */}
              {step === 1 && (
                <div className="space-y-6">
                  <section>
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                      Choose Practitioner
                    </p>
                    <div className="space-y-2">
                      {practitioners.length === 0 && (
                        <p className="text-sm text-text-secondary text-center py-4">
                          No practitioners available.
                        </p>
                      )}
                      {practitioners.map((p) => {
                        const active = selectedPractitioner?._id === p._id;
                        return (
                          <button
                            key={p._id}
                            onClick={() => setSelectedPractitioner(p)}
                            className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3
                              ${
                                active
                                  ? "border-primary bg-primary/5 text-text-primary"
                                  : "border-border bg-bg-page text-text-secondary hover:border-primary/40"
                              }`}
                          >
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                              {p.firstName[0]}
                              {p.lastName[0]}
                            </div>
                            <span className="font-medium text-sm">
                              Dr. {p.firstName} {p.lastName}
                            </span>
                            {active && (
                              <Check
                                size={16}
                                className="ml-auto text-primary shrink-0"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section>
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                      Appointment Type
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {APPOINTMENT_TYPES.map((type) => {
                        const active = selectedType === type;
                        return (
                          <button
                            key={type}
                            onClick={() => setSelectedType(type)}
                            className={`text-left px-3 py-3 rounded-xl border text-sm transition-all
                              ${
                                active
                                  ? "border-primary bg-primary/5 text-primary font-medium"
                                  : "border-border bg-bg-page text-text-secondary hover:border-primary/40"
                              }`}
                          >
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>
              )}

              {/* ── STEP 2 — Date & Slots ── */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                      Select Date
                    </p>
                    <input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={selectedDate}
                      onChange={(e) => {
                        const date = e.target.value;
                        setSelectedDate(date);
                        if (selectedPractitioner)
                          fetchSlots(date, selectedPractitioner);
                      }}
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-bg-page text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                    />
                  </div>

                  {selectedDate && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          Available Slots
                        </p>
                        {!slotsLoading && availableSlots.length > 0 && (
                          <span className="text-xs text-text-disabled">
                            {availableSlots.length} slot
                            {availableSlots.length !== 1 ? "s" : ""} available
                          </span>
                        )}
                      </div>

                      {slotsLoading ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                          <p className="text-xs text-text-disabled">
                            Checking availability…
                          </p>
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-2 text-text-disabled">
                          <CalendarX size={28} />
                          <p className="text-sm font-medium text-text-secondary">
                            No slots available
                          </p>
                          <p className="text-xs text-center leading-relaxed">
                            No open slots on this date.
                            <br />
                            Try selecting a different date.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {availableSlots.map((slot) => {
                            const active = selectedSlot?.start === slot.start;
                            return (
                              <button
                                key={slot.start}
                                onClick={() => setSelectedSlot(slot)}
                                className={`py-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-0.5
                                  ${
                                    active
                                      ? "bg-primary text-white border-primary shadow-sm"
                                      : "border-border text-text-secondary bg-bg-page hover:border-primary/40 hover:text-text-primary"
                                  }`}
                              >
                                <span>{formatTime(slot.start)}</span>
                                <span
                                  className={`text-[10px] font-normal ${active ? "text-white/70" : "text-text-disabled"}`}
                                >
                                  {formatDuration(slot)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 3 — Confirm ── */}
              {step === 3 && selectedSlot && selectedPractitioner && (
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                    Review & Confirm
                  </p>

                  <div className="bg-bg-page border border-border rounded-xl divide-y divide-border">
                    {[
                      [
                        "Practitioner",
                        `Dr. ${selectedPractitioner.firstName} ${selectedPractitioner.lastName}`,
                      ],
                      ["Session Type", selectedType],
                      ["Date & Time", formatDateTime(selectedSlot.start)],
                      ["Duration", formatDuration(selectedSlot)],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex justify-between gap-4 px-4 py-3 text-sm"
                      >
                        <span className="text-text-secondary shrink-0">
                          {label}
                        </span>
                        <span className="text-text-primary font-medium text-right">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-text-disabled text-center pt-1">
                    You'll receive a confirmation once the booking is accepted.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex gap-3 shrink-0">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-border rounded-xl text-sm text-text-secondary hover:bg-bg-hover transition-colors"
            >
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <button
            disabled={!canAdvance || bookingLoading}
            onClick={() => {
              if (step < 3) setStep((s) => (s + 1) as Step);
              else void confirmBooking();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {bookingLoading ? (
              <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : step === 3 ? (
              <>
                <Check size={16} /> Confirm Booking
              </>
            ) : (
              <>
                Next <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
