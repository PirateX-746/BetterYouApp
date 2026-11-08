import axios from "axios";
import { clearSessionStorage } from "./session";
import { PORTAL_HEADER, clearAdminSessionStorage, isAdminPortal } from "./portal";
import { encryptObjectPasswords } from "./passwordTransport";

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

// Password fields leave the browser encrypted (see passwordTransport.ts).
api.interceptors.request.use(async (config) => {
  if (config.data) config.data = await encryptObjectPasswords(config.data);
  // Console pages use their own session cookie; tell the API which one.
  if (isAdminPortal()) config.headers.set(PORTAL_HEADER, "admin");
  return config;
});

/* ---------------------------------------------------------------
   Friendly errors.

   Screens show `err.response.data.message`, falling back to
   `err.message`. Left alone, those surface raw transport text such as
   "Request failed with status code 500", "Network Error", an HTML 502
   page from the proxy, or the server's generic "Internal server error".
   Normalise both here, once, so no screen ever shows a status code.
   A specific server message (validation, "Invalid email or password",
   conflicts, ...) is kept as is.
   --------------------------------------------------------------- */
const GENERIC_SERVER_MESSAGES = new Set([
  "internal server error",
  "bad gateway",
  "service unavailable",
  "gateway timeout",
  "not found",
  "unauthorized",
  "forbidden",
  "payment required",
  "bad request",
]);

function friendlyMessageFor(status: number | undefined, code?: string): string {
  if (status === undefined) {
    if (code === "ECONNABORTED" || code === "ETIMEDOUT")
      return "This is taking longer than expected. Please check your connection and try again.";
    if (typeof navigator !== "undefined" && navigator.onLine === false)
      return "You appear to be offline. Please check your internet connection and try again.";
    return "We couldn't reach the server. Please check your connection and try again.";
  }
  switch (status) {
    case 400:
      return "Some of the details look incorrect. Please check and try again.";
    case 401:
      return "Your session has ended. Please sign in again.";
    case 402:
      return "This feature isn't included in your current plan.";
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return "We couldn't find what you were looking for. It may have been moved or removed.";
    case 408:
      return "This is taking longer than expected. Please try again.";
    case 409:
      return "This conflicts with an existing record. Please refresh and try again.";
    case 413:
      return "That file is too large. Please choose a smaller one.";
    case 429:
      return "Too many attempts. Please wait a moment and try again.";
    default:
      if (status >= 500)
        return "Something went wrong on our end. Please try again in a moment.";
      return "Something went wrong. Please try again.";
  }
}

/** True when the server sent nothing a person should read. */
function isUnhelpful(msg: unknown): boolean {
  if (Array.isArray(msg)) return msg.length === 0;
  if (typeof msg !== "string" || !msg.trim()) return true;
  const m = msg.trim().toLowerCase();
  return (
    GENERIC_SERVER_MESSAGES.has(m) ||
    /status code \d{3}/.test(m) ||
    m.startsWith("<") // an HTML error page from a proxy
  );
}

function humaniseError(error: unknown): void {
  if (!axios.isAxiosError(error)) return;
  const status = error.response?.status;
  const friendly = friendlyMessageFor(status, error.code);

  // err.message is the last-resort fallback many screens use.
  error.message = friendly;

  if (!error.response) return;
  const data = error.response.data;
  // 5xx: never show the server's wording (it can leak internals).
  if (status !== undefined && status >= 500) {
    error.response.data = {
      ...(data && typeof data === "object" ? data : {}),
      message: friendly,
    };
    return;
  }
  if (data && typeof data === "object" && !(typeof Blob !== "undefined" && data instanceof Blob)) {
    const d = data as { message?: unknown };
    if (isUnhelpful(d.message)) d.message = friendly;
  } else {
    // Text/HTML/blob bodies: replace with something readable.
    error.response.data = { message: friendly };
  }
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    humaniseError(error);
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const path = window.location.pathname;
      const isAuthPage =
        path.includes("Login") || path.includes("Signup") || path === "/";
      if (!isAuthPage) {
        // Only this portal's session ended; leave the other one alone.
        if (isAdminPortal()) {
          clearAdminSessionStorage();
          window.location.href = "/adminLogin";
          return Promise.reject(error);
        }
        clearSessionStorage();
        for (const name of ["name", "userId"]) {
          document.cookie = `${name}=;expires=${new Date(0).toUTCString()};path=/`;
        }
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  },
);

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

  delete: (id: string) =>
    api.delete<{ deleted: true }>(`/appointment-types/${id}`),
};

/** The server's error message (validation, conflict, ...) or a fallback. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: unknown } } })?.response
    ?.data?.message;
  if (Array.isArray(msg)) return msg.join(", ");
  return typeof msg === "string" && msg ? msg : fallback;
}
