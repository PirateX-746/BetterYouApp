"use client";

import { useEffect, useState, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import GlassCard from "@/components/GlassCard";
import { api } from "@/lib/api";

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

type FilterType = "all" | "upcoming" | "past" | "cancelled";
type ViewType = "list" | "timeline";

export default function AppointmentsPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [filter, setFilter] = useState<FilterType>("all");
    const [view, setView] = useState<ViewType>("list");

    useEffect(() => {
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        const fetchAppointments = async () => {
            const res = await api.get(`/appointments/patient/${userId}`);
            setAppointments(res.data);
        };

        fetchAppointments();

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
            socket.disconnect();
        };
    }, []);

    const now = new Date();

    const filteredAppointments = useMemo(() => {
        return appointments.filter((appt) => {
            const start = new Date(appt.start);

            if (filter === "upcoming") return start > now;
            if (filter === "past") return start < now;
            if (filter === "cancelled") return appt.status === "cancelled";

            return true;
        });
    }, [appointments, filter]);

    const renderListView = () => (
        <div className="space-y-5">
            {filteredAppointments.map((appt) => {
                const start = new Date(appt.start);

                return (
                    <GlassCard key={appt.id}>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-semibold">{appt.title}</p>
                                <p className="text-sm text-gray-500">
                                    {start.toLocaleDateString()} •{" "}
                                    {start.toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>

                            <span className="text-blue-500 text-sm font-medium">
                                {appt.status}
                            </span>
                        </div>
                    </GlassCard>
                );
            })}
        </div>
    );

    const renderTimeline = () => {
        const sorted = [...filteredAppointments].sort(
            (a, b) =>
                new Date(a.start).getTime() -
                new Date(b.start).getTime()
        );

        return (
            <div className="space-y-6">
                {sorted.map((appt) => (
                    <div key={appt.id} className="flex gap-4">
                        <div className="w-1 bg-blue-500 rounded-full" />
                        <div>
                            <p className="font-medium">{appt.title}</p>
                            <p className="text-sm text-gray-500">
                                {new Date(appt.start).toLocaleString()}
                            </p>
                            <p className="text-xs text-blue-500">
                                {appt.status}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-8">

            {/* FILTER TABS */}
            <div className="flex gap-3 flex-wrap">
                {["all", "upcoming", "past", "cancelled"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab as FilterType)}
                        className={`px-4 py-2 rounded-xl text-sm capitalize ${filter === tab
                            ? "bg-blue-500 text-white"
                            : "bg-white border border-blue-100"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* VIEW TOGGLE */}
            <div className="flex gap-3">
                <button
                    onClick={() => setView("list")}
                    className={`px-4 py-2 rounded-xl text-sm ${view === "list"
                        ? "bg-blue-500 text-white"
                        : "bg-white border border-blue-100"
                        }`}
                >
                    List View
                </button>

                <button
                    onClick={() => setView("timeline")}
                    className={`px-4 py-2 rounded-xl text-sm ${view === "timeline"
                        ? "bg-blue-500 text-white"
                        : "bg-white border border-blue-100"
                        }`}
                >
                    Timeline
                </button>
            </div>

            {view === "list" ? renderListView() : renderTimeline()}
        </div>
    );
}