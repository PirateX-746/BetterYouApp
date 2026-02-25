export interface Appointment {
    id: string;
    title: string;
    start: string;
    end: string;
    patientId: string;
    practitionerId: string;
    notes?: string;
    status: "pending" | "confirmed" | "cancelled" | "completed";
    deleted?: boolean;
}

export interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    patientId: string;
    notes?: string;
    status?: string;
}
