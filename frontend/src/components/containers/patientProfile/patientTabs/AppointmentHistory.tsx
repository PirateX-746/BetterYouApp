"use client";

import { useEffect, useState } from "react";
import {
    Calendar,
    Clock,
    ChevronDown,
    ChevronUp,
    Stethoscope,
    User
} from "lucide-react";

type Appointment = {
    _id: string;
    title: string;
    start: string;
    end: string;
    status?: string;
    notes?: string;
    type?: string;
    doctor?: {
        firstName?: string;
        lastName?: string;
    };
};

type Props = {
    patientId: string;
};

/* =============================
   FORMATTERS
============================= */

const formatDate = (value?: string) => {
    if (!value) return "—";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
};

const formatTime = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "";

    return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit"
    });
};

const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
        case "completed":
            return "bg-green-100 text-green-700";
        case "cancelled":
            return "bg-red-100 text-red-700";
        case "scheduled":
            return "bg-blue-100 text-blue-700";
        default:
            return "bg-gray-100 text-gray-600";
    }
};

export default function AppointmentHistory({ patientId }: Props) {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                const token = localStorage.getItem("token");

                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/appointments/patient/${patientId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                if (!res.ok) throw new Error("Failed to fetch");

                const data = await res.json();

                const sorted = data.sort(
                    (a: Appointment, b: Appointment) =>
                        new Date(b.start).getTime() -
                        new Date(a.start).getTime()
                );

                setAppointments(sorted);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (patientId) fetchAppointments();
    }, [patientId]);

    const toggle = (id: string) => {
        setExpanded(expanded === id ? null : id);
    };

    if (loading) {
        return <p className="text-gray-500">Loading appointments...</p>;
    }

    if (appointments.length === 0) {
        return (
            <div className="bg-white p-6 shadow">
                <h3 className="text-lg font-semibold">Appointment History</h3>
                <p className="text-gray-500 mt-2">No appointment records yet.</p>
            </div>
        );
    }

    // Group by date
    const grouped = appointments.reduce((acc: any, appt) => {
        const date = formatDate(appt.start);
        if (!acc[date]) acc[date] = [];
        acc[date].push(appt);
        return acc;
    }, {});

    return (
        <div>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-600" />
                Appointment Timeline
            </h2>

            <div className="relative border-l border-gray-200 ml-4 space-y-10">
                {Object.entries(grouped).map(([date, items]) => (
                    <div key={date}>
                        {/* 🔥 Sticky Date Header */}
                        <div className="sticky top-0 bg-white z-10 py-2 pl-2 text-sm font-semibold text-gray-600">
                            {date}
                        </div>

                        <div className="space-y-6">
                            {(items as Appointment[]).map((appt) => {

                                return (
                                    <div key={appt._id} className="relative">
                                        {/* Timeline Dot */}
                                        <div className="absolute -left-[26px] top-3 w-8 h-8 bg-white border border-gray-200 rounded-sm flex items-center justify-center shadow-sm">
                                            <Stethoscope className="w-4 h-4 text-blue-600" />
                                        </div>

                                        {/* Card */}
                                        <div className="bg-gray-50 hover:bg-gray-100 transition-all rounded-sm p-5 border-l-4 border-blue-400 shadow-sm">
                                            <div
                                                className="flex justify-between cursor-pointer"
                                                onClick={() => toggle(appt._id)}
                                            >
                                                <div>
                                                    <h3 className="font-semibold text-gray-800">
                                                        {appt.type
                                                            ? `${appt.type} Appointment`
                                                            : appt.title}
                                                    </h3>

                                                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                                        <Clock className="w-4 h-4" />
                                                        {formatTime(appt.start)} -{" "}
                                                        {formatTime(appt.end)}
                                                    </div>

                                                    {appt.status && (
                                                        <span
                                                            className={`inline-block mt-2 text-xs px-2 py-1 rounded-sm ${getStatusColor(
                                                                appt.status
                                                            )}`}
                                                        >
                                                            {appt.status}
                                                        </span>
                                                    )}
                                                </div>

                                                {expanded === appt._id ? (
                                                    <ChevronUp className="w-4 h-4 text-gray-500" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                                )}
                                            </div>

                                            {/* 🔥 Smooth Animated Expand */}
                                            <div
                                                className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded === appt._id
                                                    ? "max-h-40 opacity-100 mt-4"
                                                    : "max-h-0 opacity-0"
                                                    }`}
                                            >
                                                <div className="pt-4 border-t text-sm text-gray-700">
                                                    {appt.notes || "No additional notes available."}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
