import axios from "axios";

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
        localStorage.clear();
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