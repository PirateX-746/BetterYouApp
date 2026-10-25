/**
 * Links into a specific record, used by notifications and toasts so they
 * open the thing they talk about rather than a list.
 *
 * Pages that are already mounted can't see a search-param change without a
 * Suspense boundary, so same-page jumps are also announced as a window event.
 * A client-side navigation mounts the page before the URL changes, so the
 * target is also handed over in memory (see openAppointmentFromElsewhere).
 */
export const OPEN_APPOINTMENT_EVENT = "betteryou:open-appointment";

export const APPOINTMENTS_PATH = "/appointmentsPractitioner";

export const appointmentHref = (id: string) => `${APPOINTMENTS_PATH}?appointment=${encodeURIComponent(id)}`;

let pendingAppointmentId: string | null = null;

/** Navigates to the calendar with an appointment to open on arrival. */
export function openAppointmentFromElsewhere(id: string, push: (href: string) => void) {
  pendingAppointmentId = id;
  push(appointmentHref(id));
}

/**
 * The appointment to open when the calendar mounts. Only peeks — React may
 * run state initialisers twice in development — so the calendar clears it
 * with clearPendingAppointment once handled.
 */
export function pendingAppointment(): string | null {
  return pendingAppointmentId;
}

export function clearPendingAppointment() {
  pendingAppointmentId = null;
}

/** Opens an appointment on the calendar page that is already showing. */
export function announceOpenAppointment(id: string) {
  window.dispatchEvent(new CustomEvent<string>(OPEN_APPOINTMENT_EVENT, { detail: id }));
}
