import axios from "axios";
import { clearSessionStorage } from "./session";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  // Session lives in an HttpOnly cookie set by the backend, so every request
  // must carry credentials. Same-origin in the browser via the /api/* rewrite.
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  },
});

/* ---------------------------------------------------------------
   In-flight GET de-duplication.

   Several sibling components legitimately ask for the same resource
   on mount (e.g. ProgressScoreChart, PatientTimeline and ProgressNotes
   all need /progress-notes for the same patient). Without this, one
   page load fires the same request three times.

   Only *concurrent* identical GETs share a promise — the entry is
   dropped as soon as it settles, so a refetch after a mutation always
   hits the network. Nothing is cached.
   --------------------------------------------------------------- */
const inFlight = new Map<string, Promise<unknown>>();

const originalGet = api.get.bind(api);

api.get = function dedupedGet(this: unknown, url: string, config?: object) {
  const key = `${url}|${JSON.stringify((config as { params?: unknown })?.params ?? null)}`;

  const existing = inFlight.get(key);
  if (existing) return existing as ReturnType<typeof originalGet>;

  const request = originalGet(url, config).finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, request);
  return request;
} as typeof api.get;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const path = window.location.pathname;
      const isAuthPage =
        path.includes("Login") ||
        path.includes("Signup") ||
        path === "/";
      if (!isAuthPage) {
        clearSessionStorage();
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
        });
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

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
  appointmentTypeId?: string | null;
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
  /** Ignored by the server when appointmentTypeId is set — the type's name wins. */
  title?: string;
  appointmentTypeId?: string;
  patientId: string;
  practitionerId: string;
  start: string;
  end: string;
  status?: AppointmentStatus;
  notes?: string;
}

export interface UpdateAppointmentPayload {
  title?: string;
  appointmentTypeId?: string;
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

/* =====================================================
   APPOINTMENT TYPES API
   ===================================================== */

export interface AppointmentType {
  _id: string;
  name: string;
  durationMinutes: number;
  /** "#rrggbb" */
  color: string;
  isActive: boolean;
  sortOrder: number;
}

export type AppointmentTypeInput = Pick<
  AppointmentType,
  "name" | "durationMinutes" | "color"
> & { isActive?: boolean };

export const appointmentTypesApi = {
  // GET /appointment-types — the caller's own list (practitioner), or a
  // practitioner's bookable list when called by a patient with practitionerId.
  list: (practitionerId?: string) =>
    api.get<AppointmentType[]>(`/appointment-types`, {
      params: practitionerId ? { practitionerId } : undefined,
    }),

  create: (input: AppointmentTypeInput) =>
    api.post<AppointmentType>(`/appointment-types`, input),

  update: (id: string, input: Partial<AppointmentTypeInput>) =>
    api.patch<AppointmentType>(`/appointment-types/${id}`, input),

  delete: (id: string) => api.delete<{ deleted: true }>(`/appointment-types/${id}`),
};

/** The server's error message (validation, conflict, ...) or a fallback. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: unknown } } })?.response
    ?.data?.message;
  if (Array.isArray(msg)) return msg.join(", ");
  return typeof msg === "string" && msg ? msg : fallback;
}
