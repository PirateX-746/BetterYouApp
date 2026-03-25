import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

/* =====================================================
   TYPES
   ===================================================== */

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export interface Appointment {
  id: string;
  title: string;
  start: string;
  end: string;
  practitionerId: string;
  patientId: string;
  notes?: string;
  status: AppointmentStatus;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
}

export interface CreateAppointmentPayload {
  title: string;
  patientId: string;
  practitionerId: string;
  start: string;
  end: string;
  status?: AppointmentStatus;
  notes?: string;
}

export interface UpdateAppointmentPayload {
  title?: string;
  start?: string;
  end?: string;
  notes?: string;
  status?: AppointmentStatus;
}

/* =====================================================
   APPOINTMENTS API
   ===================================================== */

export const appointmentsApi = {
  // GET /appointments/patient/:id
  getByPatient: (patientId: string) =>
    api.get<Appointment[]>(`/appointments/patient/${patientId}`),

  // GET /appointments/practitioner/:id
  getByPractitioner: (practitionerId: string) =>
    api.get<Appointment[]>(`/appointments/practitioner/${practitionerId}`),

  // GET /appointments/availability?practitionerId=&date=
  getAvailability: (practitionerId: string, date: string) =>
    api.get<AvailabilitySlot[]>(`/appointments/availability`, {
      params: { practitionerId, date },
    }),

  // POST /appointments
  create: (payload: CreateAppointmentPayload) =>
    api.post<Appointment>(`/appointments`, payload),

  // PUT /appointments/:id
  update: (id: string, payload: UpdateAppointmentPayload) =>
    api.put<Appointment>(`/appointments/${id}`, payload),

  // DELETE /appointments/:id
  delete: (id: string) =>
    api.delete<void>(`/appointments/${id}`),
};