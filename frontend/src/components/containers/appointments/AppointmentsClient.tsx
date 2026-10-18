"use client";

import { Page, PageHeader } from "@/components/common/PageLayout";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid/index.js";
import dayGridPlugin from "@fullcalendar/daygrid/index.js";
import interactionPlugin from "@fullcalendar/interaction/index.js";
import type {
  DateSpanApi,
  EventClickArg,
  EventContentArg,
  EventDropArg,
} from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { CheckCircle2, Loader2, Settings2 } from "lucide-react";
import { acquireSocket, releaseSocket } from "@/lib/useAppSocket";
import toast from "react-hot-toast";
import { api, appointmentTypesApi, type AppointmentType } from "@/lib/api";
import { CalendarEvent } from "@/types/appointment";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import AddAppointmentDialog from "./AddAppointmentDialog";
import ManageAvailabilityDialog from "./ManageAvailabilityDialog";

/* ─── Types ─── */

export interface DaySchedule {
  isOpen: boolean;
  openTime: string;  // "HH:mm"
  closeTime: string; // "HH:mm"
}
export type PracticeHours = Record<string, DaySchedule>;

const DAY_KEYS = [
  "sunday", "monday", "tuesday", "wednesday",
  "thursday", "friday", "saturday",
] as const;

const DEFAULT_HOURS: PracticeHours = {
  monday:    { isOpen: true,  openTime: "09:00", closeTime: "17:00" },
  tuesday:   { isOpen: true,  openTime: "09:00", closeTime: "17:00" },
  wednesday: { isOpen: true,  openTime: "09:00", closeTime: "17:00" },
  thursday:  { isOpen: true,  openTime: "09:00", closeTime: "17:00" },
  friday:    { isOpen: true,  openTime: "09:00", closeTime: "17:00" },
  saturday:  { isOpen: false, openTime: "09:00", closeTime: "17:00" },
  sunday:    { isOpen: false, openTime: "09:00", closeTime: "17:00" },
};

/* ─── Helpers ─── */

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Returns the schedule for a given JS Date, or null if closed */
function scheduleForDate(date: Date, hours: PracticeHours): DaySchedule | null {
  const key = DAY_KEYS[date.getDay()];
  const s = hours[key] ?? DEFAULT_HOURS[key];
  return s.isOpen ? s : null;
}

/** True if the [start, end) span fits inside the day's open window */
function withinPracticeHours(start: Date, end: Date, hours: PracticeHours): boolean {
  const schedule = scheduleForDate(start, hours);
  if (!schedule) return false;
  const openMin  = toMinutes(schedule.openTime);
  const closeMin = toMinutes(schedule.closeTime);
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin   = end.getHours()   * 60 + end.getMinutes();
  return startMin >= openMin && endMin <= closeMin;
}

/* ─── FullCalendar derived props ─── */

/** Build the businessHours array FullCalendar understands */
function toBusinessHours(hours: PracticeHours) {
  return DAY_KEYS.map((key, idx) => {
    const s = hours[key] ?? DEFAULT_HOURS[key];
    if (!s.isOpen) return null;
    return { daysOfWeek: [idx], startTime: s.openTime, endTime: s.closeTime };
  }).filter(Boolean);
}

/** Earliest open time across all open days, used for slotMinTime */
function earliestOpen(hours: PracticeHours): string {
  const times = DAY_KEYS.map((k) => hours[k] ?? DEFAULT_HOURS[k])
    .filter((s) => s.isOpen)
    .map((s) => s.openTime);
  if (!times.length) return "08:00:00";
  const min = times.reduce((a, b) => (a < b ? a : b));
  return `${min}:00`;
}

/** Latest close time across all open days, used for slotMaxTime */
function latestClose(hours: PracticeHours): string {
  const times = DAY_KEYS.map((k) => hours[k] ?? DEFAULT_HOURS[k])
    .filter((s) => s.isOpen)
    .map((s) => s.closeTime);
  if (!times.length) return "18:00:00";
  const max = times.reduce((a, b) => (a > b ? a : b));
  return `${max}:00`;
}

/* ─── Other constants ─── */

const STATUS_COLORS: Record<string, string> = {
  confirmed:   "#22c55e",
  completed:   "#3b82f6",
  cancelled:   "#ef4444",
  checked_in:  "#14b8a6",
  in_progress: "#f59e0b",
  no_show:     "#6b7280",
  pending:     "#f59e0b",
};

function getStatusColor(status?: string): string {
  return STATUS_COLORS[status ?? ""] ?? STATUS_COLORS.pending;
}

/** Completed/cancelled/no-show appointments are closed out and can no longer be rescheduled. */
function isClosedOutStatus(status?: string): boolean {
  return status === "completed" || status === "cancelled" || status === "no_show";
}

/** Shallow value equality, treating dates/ISO strings for the same instant as equal. */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === "string" && typeof b === "string") {
    const ta = Date.parse(a), tb = Date.parse(b);
    return !Number.isNaN(ta) && ta === tb && /\d{4}-\d{2}-\d{2}T/.test(a);
  }
  return (a ?? null) === (b ?? null);
}

/** Shown on the event card; "scheduled" is the default and needs no label. */
const STATUS_LABEL: Record<string, string> = {
  confirmed:   "Confirmed",
  checked_in:  "Checked in",
  in_progress: "In session",
  completed:   "Completed",
  cancelled:   "Cancelled",
  no_show:     "No-show",
};

/**
 * Calendar card. The appointment type is the primary signal (tint + left
 * bar + name first); status is spelled out in words rather than encoded in
 * color, so the two never compete and color is never the only cue.
 */
function AppointmentEventContent({ arg }: { arg: EventContentArg }) {
  const { typeColor, patientName, status } = arg.event.extendedProps as {
    typeColor?: string;
    patientName?: string;
    status?: string;
  };
  const start = arg.event.start;
  const end = arg.event.end;
  const minutes = start && end ? (end.getTime() - start.getTime()) / 60_000 : 30;
  // Short slots and month cells get one line, so the type is never cut off.
  const monthCell = arg.view.type.startsWith("dayGrid");
  const compact = monthCell || minutes <= 30;
  const closed = status === "cancelled" || status === "no_show";
  const statusLabel = STATUS_LABEL[status ?? ""];
  const tooltip = [arg.event.title, arg.timeText, patientName, statusLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={`appt-card${compact ? " appt-card--compact" : ""}${closed ? " appt-card--closed" : ""}`}
      style={{ "--appt": typeColor ?? "var(--primary)" } as React.CSSProperties}
      title={tooltip}
    >
      {compact ? (
        <p className="appt-line">
          {status === "completed" && <CheckCircle2 size={11} className="appt-icon" aria-hidden />}
          <span className="appt-title">{arg.event.title}</span>
          {/* Month cells are too narrow for both; the tooltip has the patient. */}
          {patientName && !monthCell && <span className="appt-meta">· {patientName}</span>}
        </p>
      ) : (
        <>
          <p className="appt-title">{arg.event.title}</p>
          <p className="appt-meta">
            {arg.timeText}
            {patientName && ` · ${patientName}`}
          </p>
          {statusLabel && (
            <p className="appt-status">
              {status === "completed" && <CheckCircle2 size={11} aria-hidden />}
              {statusLabel}
            </p>
          )}
        </>
      )}
    </div>
  );
}

const STATUS_TOAST: Record<string, string> = {
  scheduled:   "Appointment rescheduled",
  confirmed:   "Appointment confirmed",
  checked_in:  "Patient checked in",
  in_progress: "Session started",
  completed:   "Marked as completed",
  no_show:     "Marked as no-show",
  cancelled:   "Appointment cancelled",
};

type BlockedSlot = {
  _id: string;
  blockType: "day" | "slot";
  date: string;
  startTime?: string;
  endTime?: string;
};

/* ─── Component ─── */

export default function AppointmentsClient() {
  const practitionerId = useLocalStorage("userId");
  const calendarRef = useRef<FullCalendar | null>(null);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [practiceHours, setPracticeHours] = useState<PracticeHours>(DEFAULT_HOURS);
  const [loading, setLoading] = useState(true);

  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  /* ── Fetch ── */
  // The practitioner's types: the dialog's picker, and each event's color
  // stripe. Reloaded whenever the dialog opens so edits made in Settings
  // show up without a page refresh.
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const loadTypes = useCallback(() => {
    appointmentTypesApi
      .list()
      .then(({ data }) => setAppointmentTypes(data))
      .catch(() => {})
      .finally(() => setTypesLoading(false));
  }, []);
  useEffect(() => { loadTypes(); }, [loadTypes]);
  useEffect(() => { if (dialogOpen) loadTypes(); }, [dialogOpen, loadTypes]);

  // Patient names for the event cards ("Ananya I.").
  const [patientNames, setPatientNames] = useState<Record<string, string>>({});
  useEffect(() => {
    api
      .get("/patients")
      .then(({ data }) => {
        if (!Array.isArray(data)) return;
        const names: Record<string, string> = {};
        for (const p of data as { _id: string; firstName: string; lastName?: string }[]) {
          names[p._id] = `${p.firstName}${p.lastName ? ` ${p.lastName[0]}.` : ""}`;
        }
        setPatientNames(names);
      })
      .catch(() => {});
  }, []);

  /** Color for an event's type — by id, or by name for appointments booked before types existed. */
  const typeColor = useCallback(
    (e: CalendarEvent) =>
      appointmentTypes.find((t) => t._id === e.appointmentTypeId)?.color ??
      appointmentTypes.find((t) => t.name === e.title)?.color,
    [appointmentTypes],
  );

  const fetchAppointments = useCallback(async () => {
    if (!practitionerId) return;
    try {
      const res = await api.get(
        `/appointments/practitioner/${practitionerId}`,
        { params: { _t: Date.now() } },
      );
      if (!Array.isArray(res.data)) { setEvents([]); return; }
      setEvents(
        res.data.map((a: Record<string, unknown>) => ({
          id: (a._id ?? a.id) as string,
          title: a.title as string,
          appointmentTypeId: (a.appointmentTypeId as string | null) ?? null,
          start: a.start as string,
          end: a.end as string,
          patientId: a.patientId as string,
          notes: a.notes as string,
          status: a.status as string,
        })),
      );
    } catch {
      toast.error("Failed to load appointments");
      setEvents([]);
    }
  }, [practitionerId]);

  const fetchBlockedSlots = useCallback(async () => {
    if (!practitionerId) return;
    try {
      const res = await api.get(`/availability/${practitionerId}`);
      setBlockedSlots(Array.isArray(res.data) ? res.data : []);
    } catch {
      setBlockedSlots([]);
    }
  }, [practitionerId]);

  const fetchPracticeHours = useCallback(async () => {
    if (!practitionerId) return;
    try {
      const res = await api.get(`/practitioners/${practitionerId}`);
      const ph = res.data?.practiceHours;
      if (ph && typeof ph === "object") {
        setPracticeHours({ ...DEFAULT_HOURS, ...ph });
      }
    } catch {
      // silently fall back to defaults
    }
  }, [practitionerId]);

  useEffect(() => {
    if (!practitionerId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      fetchAppointments(),
      fetchBlockedSlots(),
      fetchPracticeHours(),
    ]).finally(() => setLoading(false));
  }, [practitionerId, fetchAppointments, fetchBlockedSlots, fetchPracticeHours]);

  /* Real-time updates */
  useEffect(() => {
    if (!practitionerId) return;
    const socket = acquireSocket({ practitionerId });
    const handleAppointmentUpdated = (incoming: CalendarEvent & { deleted?: boolean }) => {
      if (incoming.deleted) {
        setEvents((prev) => prev.filter((e) => e.id !== incoming.id));
      } else {
        setEvents((prev) => {
          const exists = prev.find((e) => e.id === incoming.id);
          if (!exists) return [...prev, incoming];
          // The echo of our own drag/save carries what we already have.
          // Returning the same array skips a re-render, and with it a full
          // re-parse of the calendar's events (a visible flash).
          const merged = { ...exists, ...incoming };
          const same = (Object.keys(merged) as (keyof CalendarEvent)[]).every(
            (k) => sameValue(merged[k], exists[k]),
          );
          if (same) return prev;
          return prev.map((e) => (e.id === incoming.id ? merged : e));
        });
      }
    };
    socket.on("appointmentUpdated", handleAppointmentUpdated);
    return () => {
      socket.off("appointmentUpdated", handleAppointmentUpdated);
      releaseSocket({ practitionerId });
    };
  }, [practitionerId]);

  /* ── Derived FullCalendar values ── */
  const businessHours = useMemo(() => toBusinessHours(practiceHours), [practiceHours]);
  const slotMinTime   = useMemo(() => earliestOpen(practiceHours), [practiceHours]);
  const slotMaxTime   = useMemo(() => latestClose(practiceHours), [practiceHours]);

  /* ── selectAllow ── */
  const selectAllow = useCallback(
    (span: DateSpanApi): boolean => {
      const { start, end } = span;

      if (start < new Date()) return false;

      // Practice hours check
      if (!withinPracticeHours(start, end, practiceHours)) return false;

      // Blocked slots check
      for (const block of blockedSlots) {
        if (block.blockType === "day") {
          if (start.toISOString().split("T")[0] === block.date) {
            toast.error("This day is blocked");
            return false;
          }
        } else if (block.blockType === "slot" && block.startTime && block.endTime) {
          const bs = new Date(`${block.date}T${block.startTime}`);
          const be = new Date(`${block.date}T${block.endTime}`);
          if (start < be && end > bs) {
            toast.error("This slot is blocked");
            return false;
          }
        }
      }
      return true;
    },
    [blockedSlots, practiceHours],
  );

  /* ── Event click ── */
  const handleEventClick = (info: EventClickArg) => {
    if (info.event.id.startsWith("block-")) return;
    const start = info.event.start ?? new Date();
    const end   = info.event.end   ?? new Date(start.getTime() + 30 * 60_000);
    setSelectedEvent({
      id: info.event.id,
      title: info.event.title,
      appointmentTypeId: info.event.extendedProps.appointmentTypeId as string | null,
      start: start.toISOString(),
      end: end.toISOString(),
      patientId: info.event.extendedProps.patientId as string,
      notes: info.event.extendedProps.notes as string,
      status: info.event.extendedProps.status as string,
    });
    setSelectedDate(start);
    setDialogOpen(true);
  };

  const handleSlotSelect = (info: { start: Date }) => {
    setSelectedDate(info.start);
    setSelectedEvent(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedEvent(null);
    // The select interaction leaves the slot highlighted until this is
    // cleared explicitly — closing via Escape (or anything other than a
    // click elsewhere on the calendar grid) doesn't trigger FullCalendar's
    // own auto-unselect.
    calendarRef.current?.getApi().unselect();
  };

  /* ── Save / delete ── */
  const handleSave = async (payload: Record<string, unknown>, id?: string) => {
    if (!practitionerId) return;
    try {
      if (id) {
        const { data: saved } = await api.put(`/appointments/${id}`, { ...payload, practitionerId });
        // Take title/type from the server: picking a type sets the title there.
        setEvents((prev) =>
          prev.map((e) =>
            e.id === id
              ? { ...e, title: saved.title, appointmentTypeId: saved.appointmentTypeId ?? null, start: payload.start as string, end: payload.end as string, notes: payload.notes as string }
              : e,
          ),
        );
      } else {
        await api.post("/appointments", { ...payload, practitionerId });
        await fetchAppointments();
      }
      toast.success("Saved successfully");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? "Failed to save");
      fetchAppointments();
    }
  };

  const handleDelete = async (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    try {
      await api.delete(`/appointments/${id}`);
      toast.success("Deleted successfully");
    } catch (err: unknown) {
      await fetchAppointments();
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? "Delete failed");
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
      // The dialog's `event` prop is a snapshot taken when it opened, so the
      // "Session Assessment" button needs this nudge to appear without a
      // close/reopen round trip.
      setSelectedEvent((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
      toast.success(STATUS_TOAST[status] ?? "Status updated");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? "Failed to update status");
    }
  };

  /* ── Drag & resize ── */
  const updateEventByDrag = useCallback(
    async (info: EventDropArg | EventResizeDoneArg) => {
      if (!practitionerId) return;
      const { event, revert } = info;
      const start = event.start ?? new Date();
      const end   = event.end   ?? new Date(start.getTime() + 30 * 60_000);

      if (isClosedOutStatus(event.extendedProps.status as string | undefined)) {
        revert();
        toast.error("This appointment is closed out and can no longer be rescheduled");
        return;
      }

      if (start < new Date()) {
        revert();
        toast.error("Cannot reschedule to a past time");
        return;
      }

      // Practice hours check
      if (!withinPracticeHours(start, end, practiceHours)) {
        revert();
        const key = DAY_KEYS[start.getDay()];
        const s = practiceHours[key] ?? DEFAULT_HOURS[key];
        const msg = !s.isOpen
          ? `Practice is closed on ${key.charAt(0).toUpperCase() + key.slice(1)}`
          : `Outside practice hours (${s.openTime} – ${s.closeTime})`;
        toast.error(msg);
        return;
      }

      // Blocked slots check
      for (const block of blockedSlots) {
        if (block.blockType === "day" && start.toISOString().split("T")[0] === block.date) {
          revert();
          toast.error("Cannot move to a blocked day");
          return;
        }
        if (block.blockType === "slot" && block.startTime && block.endTime) {
          const bs = new Date(`${block.date}T${block.startTime}`);
          const be = new Date(`${block.date}T${block.endTime}`);
          if (start < be && end > bs) {
            revert();
            toast.error("Cannot move to a blocked slot");
            return;
          }
        }
      }

      try {
        await api.put(`/appointments/${event.id}`, {
          title: event.title,
          start: start.toISOString(),
          end: end.toISOString(),
          notes: event.extendedProps.notes,
          practitionerId,
        });
        // FullCalendar already shows the new time; mirror it in state so the
        // next re-parse (any later update) doesn't snap the event back.
        setEvents((prev) =>
          prev.map((e) =>
            e.id === event.id ? { ...e, start: start.toISOString(), end: end.toISOString() } : e,
          ),
        );
        toast.success("Rescheduled");
      } catch (err: unknown) {
        revert();
        const e = err as { response?: { data?: { message?: string } } };
        toast.error(e?.response?.data?.message ?? "Reschedule failed");
        fetchAppointments();
      }
    },
    [practitionerId, blockedSlots, practiceHours, fetchAppointments],
  );

  // Built once per data change, not per render: a new array (or new source
  // objects) makes FullCalendar drop and re-add every event, which flashes.
  const eventSources = useMemo(
    () => [
      {
        events: events.map((e) => ({
          id: e.id,
          title: e.title,
          start: e.start,
          end: e.end,
          backgroundColor: getStatusColor(e.status),
          borderColor: getStatusColor(e.status),
          startEditable: !isClosedOutStatus(e.status),
          durationEditable: !isClosedOutStatus(e.status),
          extendedProps: {
            appointmentTypeId: e.appointmentTypeId ?? null,
            typeColor: typeColor(e),
            patientName: patientNames[e.patientId],
            patientId: e.patientId,
            notes: e.notes,
            status: e.status,
          },
        })),
      },
      {
        events: blockedSlots.map((b) => ({
          id: `block-${b._id}`,
          start: b.blockType === "day" ? `${b.date}T00:00:00` : `${b.date}T${b.startTime}`,
          end:   b.blockType === "day" ? `${b.date}T23:59:59` : `${b.date}T${b.endTime}`,
          display: "background",
          backgroundColor: "#fee2e2",
        })),
      },
    ],
    [events, blockedSlots, typeColor, patientNames],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    // Fits one viewport: header, legend and toolbar stay put; only the time grid scrolls.
    <Page fill>
      <PageHeader
        title="Appointments"
        subtitle="Manage your schedule"
        actions={
          <button
            onClick={() => setAvailabilityOpen(true)}
            className="h-11 flex items-center gap-2 px-4 border border-border rounded-xl text-sm text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <Settings2 size={15} aria-hidden />
            Manage Availability
          </button>
        }
      />

      <div className="flex-1 min-h-0 flex flex-col bg-bg-card border border-border rounded-2xl p-3 md:p-4 overflow-hidden">
        {appointmentTypes.some((t) => t.isActive) && (
          <ul
            className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-3 mb-3 border-b border-border text-xs text-text-secondary shrink-0"
            aria-label="Appointment type colors"
          >
            {appointmentTypes
              .filter((t) => t.isActive)
              .map((t) => (
                <li key={t._id} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} aria-hidden />
                  {t.name}
                </li>
              ))}
          </ul>
        )}
        <div className="flex-1 min-h-0">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          slotMinTime={slotMinTime}
          slotMaxTime={slotMaxTime}
          slotDuration="00:30:00"
          height="100%"
          expandRows
          stickyHeaderDates
          nowIndicator
          selectable
          selectMirror
          longPressDelay={0}
          selectLongPressDelay={0}
          eventLongPressDelay={0}
          selectAllow={selectAllow}
          selectConstraint="businessHours"
          businessHours={businessHours}
          editable
          allDaySlot={false}
          select={handleSlotSelect}
          eventClick={handleEventClick}
          eventContent={(arg) => <AppointmentEventContent arg={arg} />}
          eventDrop={updateEventByDrag}
          eventResize={updateEventByDrag}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          eventSources={eventSources}
        />
        </div>
      </div>

      <AddAppointmentDialog
        open={dialogOpen}
        initialDate={selectedDate}
        event={selectedEvent}
        practiceHours={practiceHours}
        appointmentTypes={appointmentTypes}
        typesLoading={typesLoading}
        onClose={handleDialogClose}
        onSave={handleSave}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />

      <ManageAvailabilityDialog
        open={availabilityOpen}
        practitionerId={practitionerId!}
        onClose={() => setAvailabilityOpen(false)}
        onRefresh={() => { fetchAppointments(); fetchBlockedSlots(); }}
      />
    </Page>
  );
}
