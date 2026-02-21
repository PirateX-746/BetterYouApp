"use client";

import { useState, useEffect } from "react";

type Slot = {
    time: string;
    available: boolean;
};

export default function BookAppointmentPage() {
    const [step, setStep] = useState(1);
    const [selectedType, setSelectedType] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [selectedTime, setSelectedTime] = useState<string>("");
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [reason, setReason] = useState("");
    const [alert, setAlert] = useState<{ msg: string; type: string } | null>(null);

    const doctorId = 6; // can be dynamic later

    /* ===============================
       LOAD TIME SLOTS
    =============================== */

    const loadTimeSlots = async (date: string) => {
        setLoadingSlots(true);
        setSelectedTime("");

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/get_available_slots.php?date=${date}&doctor_id=${doctorId}`
            );
            const data = await res.json();

            if (data.status === "success") {
                setSlots(data.slots);
            } else {
                setSlots([]);
            }
        } catch (err) {
            console.error(err);
            setAlert({ msg: "Error loading time slots", type: "error" });
        }

        setLoadingSlots(false);
    };

    /* ===============================
       CONFIRM BOOKING
    =============================== */

    const confirmBooking = async () => {
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/book_appointment.php`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        doctor_id: doctorId,
                        appointment_type: selectedType,
                        appointment_date: selectedDate,
                        appointment_time: selectedTime,
                        reason,
                    }),
                }
            );

            const data = await res.json();

            if (data.success) {
                setAlert({ msg: "Appointment booked successfully!", type: "success" });
                setTimeout(() => {
                    window.location.href = "/dashboard";
                }, 1500);
            } else {
                setAlert({ msg: data.message, type: "error" });
            }
        } catch (err) {
            setAlert({ msg: "Something went wrong", type: "error" });
        }
    };

    /* ===============================
       UI
    =============================== */

    return (
        <div className="min-h-screen bg-[var(--bg-page)] p-6">
            <div className="max-w-3xl mx-auto">

                {/* HEADER */}
                <div className="mb-10">
                    <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
                        Book an Appointment
                    </h1>
                    <p className="text-[var(--text-secondary)]">
                        Follow the steps to schedule your visit
                    </p>
                </div>

                {/* STEP INDICATOR */}
                <div className="flex justify-between mb-10 relative">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex flex-col items-center flex-1">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 text-sm font-semibold
                ${step === s
                                        ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                                        : step > s
                                            ? "bg-[var(--success)] text-white border-[var(--success)]"
                                            : "bg-[var(--bg-light)] border-[var(--border)] text-[var(--text-light)]"
                                    }`}
                            >
                                {step > s ? "✓" : s}
                            </div>
                            <span className="text-xs mt-2 text-[var(--text-light)]">
                                {s === 1 && "Type"}
                                {s === 2 && "Date & Time"}
                                {s === 3 && "Confirm"}
                            </span>
                        </div>
                    ))}
                </div>

                {/* CARD */}
                <div className="bg-[var(--bg-card)] p-8 rounded-lg shadow-sm border border-[var(--border)]">

                    {/* STEP 1 */}
                    {step === 1 && (
                        <>
                            <h2 className="text-lg font-semibold mb-6">
                                Select Appointment Type
                            </h2>

                            <div className="grid md:grid-cols-2 gap-6">
                                {[
                                    "New Patient Visit",
                                    "Counselling Session",
                                    "Follow-Up Session",
                                ].map((type) => (
                                    <div
                                        key={type}
                                        onClick={() => setSelectedType(type)}
                                        className={`p-6 border-2 rounded-lg cursor-pointer transition
                    ${selectedType === type
                                                ? "border-[var(--primary)] bg-[var(--primary-light)]"
                                                : "border-[var(--border-light)]"
                                            }`}
                                    >
                                        <h3 className="font-semibold">{type}</h3>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* STEP 2 */}
                    {step === 2 && (
                        <>
                            <h2 className="text-lg font-semibold mb-6">
                                Choose Date & Time
                            </h2>

                            <input
                                type="date"
                                min={new Date().toISOString().split("T")[0]}
                                value={selectedDate}
                                onChange={(e) => {
                                    setSelectedDate(e.target.value);
                                    loadTimeSlots(e.target.value);
                                }}
                                className="w-full p-3 border-2 border-[var(--border)] rounded-md mb-6 focus:border-[var(--primary)] focus:outline-none"
                            />

                            {/* TIME SLOTS */}
                            {loadingSlots ? (
                                <p className="text-[var(--text-light)]">
                                    Loading available slots...
                                </p>
                            ) : slots.length === 0 ? (
                                <p className="text-[var(--text-light)]">
                                    No available slots for this date
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-3">
                                    {slots.map((slot) => (
                                        <button
                                            key={slot.time}
                                            disabled={!slot.available}
                                            onClick={() => setSelectedTime(slot.time)}
                                            className={`px-5 py-2 rounded-full border text-sm transition
                      ${selectedTime === slot.time
                                                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                                                    : slot.available
                                                        ? "border-[var(--border)] hover:border-[var(--primary)]"
                                                        : "opacity-40 cursor-not-allowed"
                                                }`}
                                        >
                                            {slot.time}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <textarea
                                placeholder="Additional notes (optional)"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full mt-6 p-3 border-2 border-[var(--border)] rounded-md"
                            />
                        </>
                    )}

                    {/* STEP 3 */}
                    {step === 3 && (
                        <>
                            <h2 className="text-lg font-semibold mb-6">
                                Confirm Appointment
                            </h2>

                            <div className="space-y-4">
                                <SummaryItem label="Appointment Type" value={selectedType} />
                                <SummaryItem
                                    label="Date & Time"
                                    value={`${selectedDate} at ${selectedTime}`}
                                />
                                {reason && (
                                    <SummaryItem label="Notes" value={reason} />
                                )}
                            </div>
                        </>
                    )}

                    {/* ACTIONS */}
                    <div className="flex justify-between mt-10">
                        {step > 1 && (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="px-4 py-2 border rounded-md border-[var(--border)]"
                            >
                                Previous
                            </button>
                        )}

                        {step < 3 && (
                            <button
                                disabled={
                                    (step === 1 && !selectedType) ||
                                    (step === 2 && (!selectedDate || !selectedTime))
                                }
                                onClick={() => setStep(step + 1)}
                                className="ml-auto px-6 py-2 bg-[var(--primary)] text-white rounded-md disabled:opacity-50"
                            >
                                Next
                            </button>
                        )}

                        {step === 3 && (
                            <button
                                onClick={confirmBooking}
                                className="ml-auto px-6 py-2 bg-[var(--primary)] text-white rounded-md"
                            >
                                Confirm Booking
                            </button>
                        )}
                    </div>
                </div>

                {/* ALERT */}
                {alert && (
                    <div
                        className={`mt-6 p-4 rounded-md text-white ${alert.type === "success"
                            ? "bg-[var(--success)]"
                            : "bg-[var(--danger)]"
                            }`}
                    >
                        {alert.msg}
                    </div>
                )}
            </div>
        </div>
    );
}

function SummaryItem({ label, value }: any) {
    return (
        <div className="p-4 bg-[var(--bg-light)] rounded-md border-l-4 border-[var(--primary)]">
            <div className="text-xs text-[var(--text-light)] uppercase mb-1">
                {label}
            </div>
            <div className="font-semibold text-[var(--text-primary)]">
                {value}
            </div>
        </div>
    );
}