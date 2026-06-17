"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid/index.js";
import dayGridPlugin from "@fullcalendar/daygrid/index.js";
import interactionPlugin from "@fullcalendar/interaction/index.js";
import type {
  DateSpanApi,
  EventClickArg,
  EventDropArg,
} from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { Loader2, Settings2 } from "lucide-react";
import { createSocket } from "@/lib/socket";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
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

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [practiceHours, setPracticeHours] = useState<PracticeHours>(DEFAULT_HOURS);
  const [loading, setLoading] = useState(true);

  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  /* ── Fetch ── */
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
    const socket = createSocket({ practitionerId });
    socket.on(
      "appointmentUpdated",
      (incoming: CalendarEvent & { deleted?: boolean }) => {
        if (incoming.deleted) {
          setEvents((prev) => prev.filter((e) => e.id !== incoming.id));
        } else {
          setEvents((prev) => {
            const exists = prev.find((e) => e.id === incoming.id);
            if (exists) return prev.map((e) => (e.id === incoming.id ? { ...e, ...incoming } : e));
            return [...prev, incoming];
          });
        }
      },
    );
    return () => { socket.disconnect(); };
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

  /* ── Save / delete ── */
  const handleSave = async (payload: Record<string, unknown>, id?: string) => {
    if (!practitionerId) return;
    try {
      if (id) {
        await api.put(`/appointments/${id}`, { ...payload, practitionerId });
        setEvents((prev) =>
          prev.map((e) =>
            e.id === id
              ? { ...e, title: payload.title as string, start: payload.start as string, end: payload.end as string, notes: payload.notes as string }
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

  /* ── Drag & resize ── */
  const updateEventByDrag = useCallback(
    async (info: EventDropArg | EventResizeDoneArg) => {
      if (!practitionerId) return;
      const { event, revert } = info;
      const start = event.start ?? new Date();
      const end   = event.end   ?? new Date(start.getTime() + 30 * 60_000);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Appointments</h1>
          <p className="text-sm text-text-secondary mt-0.5">Manage your schedule</p>
        </div>
        <button
          onClick={() => setAvailabilityOpen(true)}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm text-text-secondary hover:bg-bg-hover transition"
        >
          <Settings2 size={15} />
          <span className="hidden sm:inline">Manage Availability</span>
          <span className="sm:hidden">Availability</span>
        </button>
      </div>

      <div className="bg-bg-card border border-border rounded-2xl p-3 md:p-5 overflow-hidden">
        <FullCalendar
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          slotMinTime={slotMinTime}
          slotMaxTime={slotMaxTime}
          slotDuration="00:30:00"
          height="auto"
          contentHeight="auto"
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
          eventDrop={updateEventByDrag}
          eventResize={updateEventByDrag}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          eventSources={[
            {
              events: events.map((e) => ({
                id: e.id,
                title: e.title,
                start: e.start,
                end: e.end,
                backgroundColor: getStatusColor(e.status),
                borderColor: getStatusColor(e.status),
                extendedProps: {
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
          ]}
        />
      </div>

      <AddAppointmentDialog
        open={dialogOpen}
        initialDate={selectedDate}
        event={selectedEvent}
        practiceHours={practiceHours}
        onClose={() => { setDialogOpen(false); setSelectedEvent(null); }}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <ManageAvailabilityDialog
        open={availabilityOpen}
        practitionerId={practitionerId!}
        onClose={() => setAvailabilityOpen(false)}
        onRefresh={() => { fetchAppointments(); fetchBlockedSlots(); }}
      />
    </div>
  );
}
