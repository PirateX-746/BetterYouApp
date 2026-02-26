"use client";

import { api } from "@/lib/api";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Appointment = {
    id: string;
    title: string;
    patientId: string;
    start: string;
    end: string;
    status: string;
};

export default function AppointmentHistory() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    const params = useParams();
    const patientId = params?.id as string;

    useEffect(() => {
        if (!patientId) return; // ✅ prevent undefined call

        const fetchAppointments = async () => {
            try {
                const res = await api.get(`/appointments/patient/${patientId}`);

                const data = res.data;

                if (Array.isArray(data)) {
                    setAppointments(data);
                } else if (Array.isArray(data.data)) {
                    setAppointments(data.data);
                } else {
                    setAppointments([]);
                }
            } catch (error) {
                console.error("Failed to fetch appointments:", error);
                setAppointments([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAppointments();
    }, [patientId]); // ✅ dependency added

    if (loading) return <p>Loading appointments...</p>;

    return (
        <div className="space-y-4">
            {appointments.map((appointment) => {
                const start = new Date(appointment.start);
                const end = new Date(appointment.end);

                return (
                    <div key={appointment.id} className="border p-4 rounded-lg">
                        <p className="font-semibold">{appointment.title}</p>
                        <p>{start.toLocaleDateString()}</p>
                        <p>
                            {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {" - "}
                            {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p>Status: {appointment.status.replace(/"/g, "")}</p>
                    </div>
                );
            })}
        </div>
    );
}