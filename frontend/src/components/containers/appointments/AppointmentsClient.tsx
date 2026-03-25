"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Helpers } from "@/utils/helpers";
import { api } from "@/lib/api";
import { CalendarEvent } from "@/types/appointment";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import AddAppointmentDialog from "./AddAppointmentDialog";
import ManageAvailabilityDialog from "./ManageAvailabilityDialog";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#22c55e",
  completed: "#3b82f6",
  cancelled: "#ef4444",
  pending: "#f59e0b",
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

export default function AppointmentsClient() {
  const practitionerId = useLocalStorage("userId");

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );

  /* ── Fetch ── */
  const fetchAppointments = useCallback(async () => {
    if (!practitionerId) return;
    try {
      // _t busts the browser cache — prevents 304 Not Modified returning stale data
      const res = await api.get(
        `/appointments/practitioner/${practitionerId}`,
        {
          params: { _t: Date.now() },
        },
      );
      if (!Array.isArray(res.data)) {
        setEvents([]);
        return;
      }
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
    } catch (err) {
      console.error(err);
      Helpers.showNotification("Failed to load appointments", "error");
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

  useEffect(() => {
    if (!practitionerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([fetchAppointments(), fetchBlockedSlots()]).finally(() =>
      setLoading(false),
    );
  }, [practitionerId, fetchAppointments, fetchBlockedSlots]);

  /* Real-time: listen for appointment updates emitted to the practitioner room */
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
            if (exists) {
              return prev.map((e) =>
                e.id === incoming.id ? { ...e, ...incoming } : e,
              );
            }
            // Replace any optimistic placeholder and add the confirmed event
            return [
              ...prev.filter((e) => !e.id.startsWith("optimistic-")),
              incoming,
            ];
          });
        }
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [practitionerId]);

  /* ── selectAllow — prevent selecting past slots for new appointments ── */
  const selectAllow = (span: DateSpanApi): boolean => {
    const selStart = span.start;
    const selEnd = span.end;

    // Block creating new appointments in the past
    if (selStart < new Date()) return false;

    for (const block of blockedSlots) {
      if (block.blockType === "day") {
        if (selStart.toISOString().split("T")[0] === block.date) {
          Helpers.showNotification("This day is blocked", "error");
          return false;
        }
      } else if (
        block.blockType === "slot" &&
        block.startTime &&
        block.endTime
      ) {
        const bs = new Date(`${block.date}T${block.startTime}`);
        const be = new Date(`${block.date}T${block.endTime}`);
        if (selStart < be && selEnd > bs) {
          Helpers.showNotification("This slot is blocked", "error");
          return false;
        }
      }
    }
    return true;
  };

  /* ── Event click — allow viewing history, only open edit dialog for future appointments ── */
  const handleEventClick = (info: EventClickArg) => {
    if (info.event.id.startsWith("block-")) return;

    // FC types: event.start is Date | null — guard with fallback
    const start = info.event.start ?? new Date();
    const end = info.event.end ?? new Date(start.getTime() + 30 * 60_000);

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
        // Edit — optimistically update immediately, refetch to confirm
        await api.put(`/appointments/${id}`, { ...payload, practitionerId });
        setEvents((prev) =>
          prev.map((e) =>
            e.id === id
              ? {
                  ...e,
                  title: payload.title as string,
                  start: payload.start as string,
                  end: payload.end as string,
                  notes: payload.notes as string,
                }
              : e,
          ),
        );
      } else {
        // Create — backend only returns {status:"success"}, no appointment object.
        // Build the optimistic event from the payload we already have.
        // Use a temp ID prefixed "optimistic-"; fetchAppointments() below will
        // replace it with the real server ID.
        await api.post("/appointments", { ...payload, practitionerId });
        const optimisticEvent: CalendarEvent = {
          id: `optimistic-${Date.now()}`,
          title: payload.title as string,
          start: payload.start as string,
          end: payload.end as string,
          patientId: payload.patientId as string,
          notes: (payload.notes ?? "") as string,
          status: "pending",
        };
        setEvents((prev) => [...prev, optimisticEvent]);
      }

      Helpers.showNotification("Saved successfully", "success");
      // No background refetch here — the WebSocket `appointmentUpdated` event
      // will fire from the server and replace the optimistic entry with the
      // real record (correct ID, status, etc.). A refetch would race the socket
      // and overwrite state with stale data before the DB write propagates.
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      Helpers.showNotification(
        e?.response?.data?.message ?? "Failed to save",
        "error",
      );
      // On failure, refetch to restore correct state
      fetchAppointments();
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistically remove from state immediately so calendar updates at once
    setEvents((prev) => prev.filter((e) => e.id !== id));
    try {
      await api.delete(`/appointments/${id}`);
      Helpers.showNotification("Deleted successfully", "success");
    } catch (err: unknown) {
      // Revert on failure
      await fetchAppointments();
      const e = err as { response?: { data?: { message?: string } } };
      Helpers.showNotification(
        e?.response?.data?.message ?? "Delete failed",
        "error",
      );
    }
  };

  /* ── Drag & resize — prevent moving to past, blocked slots still apply ── */
  const updateEventByDrag = useCallback(
    async (info: EventDropArg | EventResizeDoneArg) => {
      if (!practitionerId) return;
      const { event, revert } = info;
      // FC types: event.start is Date | null — guard with fallback
      const start = event.start ?? new Date();
      const end = event.end ?? new Date(start.getTime() + 30 * 60_000);

      // Prevent dragging/resizing into the past
      if (start < new Date()) {
        revert();
        Helpers.showNotification("Cannot reschedule to a past time", "error");
        return;
      }

      for (const block of blockedSlots) {
        if (
          block.blockType === "day" &&
          start.toISOString().split("T")[0] === block.date
        ) {
          revert();
          Helpers.showNotification("Cannot move to blocked day", "error");
          return;
        }
        if (block.blockType === "slot" && block.startTime && block.endTime) {
          const bs = new Date(`${block.date}T${block.startTime}`);
          const be = new Date(`${block.date}T${block.endTime}`);
          if (start < be && end > bs) {
            revert();
            Helpers.showNotification("Cannot move to blocked slot", "error");
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
        Helpers.showNotification("Rescheduled", "success");
        // WebSocket will update state — no refetch needed here
      } catch (err: unknown) {
        revert();
        const e = err as { response?: { data?: { message?: string } } };
        Helpers.showNotification(
          e?.response?.data?.message ?? "Reschedule failed",
          "error",
        );
        fetchAppointments(); // revert state on failure
      }
    },
    [practitionerId, blockedSlots, fetchAppointments],
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
          <h1 className="text-xl font-semibold text-text-primary">
            Appointments
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Manage your schedule
          </p>
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
          slotMinTime="10:00:00"
          slotMaxTime="18:00:00"
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
                start:
                  b.blockType === "day"
                    ? `${b.date}T00:00:00`
                    : `${b.date}T${b.startTime}`,
                end:
                  b.blockType === "day"
                    ? `${b.date}T23:59:59`
                    : `${b.date}T${b.endTime}`,
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
        onClose={() => {
          setDialogOpen(false);
          setSelectedEvent(null);
        }}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <ManageAvailabilityDialog
        open={availabilityOpen}
        practitionerId={practitionerId!}
        onClose={() => setAvailabilityOpen(false)}
        onRefresh={() => {
          fetchAppointments();
          fetchBlockedSlots();
        }}
      />
    </div>
  );
}
