"use client";

import { useCallback, useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid/index.js";
import dayGridPlugin from "@fullcalendar/daygrid/index.js";
import interactionPlugin from "@fullcalendar/interaction/index.js";
import { Helpers } from "@/utils/helpers";
import { api } from "@/lib/api";
import { CalendarEvent } from "@/types/appointment";
import AddAppointmentDialog from "./AddAppointmentDialog";
import { Button } from "@/components/ui/button";
import ManageAvailabilityDialog from "./ManageAvailabilityDialog";

export default function AppointmentsClient() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [practitionerId, setPractitionerId] = useState<string | null>(null);

  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );

  /* ================= READ PRACTITIONER ================= */

  useEffect(() => {
    const id = localStorage.getItem("userId");

    if (!id) {
      Helpers.showNotification("Practitioner not logged in", "error");
      setLoading(false);
      return;
    }

    setPractitionerId(id);
  }, []);

  /* ================= FETCH APPOINTMENTS ================= */

  const fetchAppointments = useCallback(async () => {
    if (!practitionerId) return;

    try {
      const res = await api.get(`/appointments/practitioner/${practitionerId}`);

      if (!Array.isArray(res.data)) {
        setEvents([]);
        return;
      }

      setEvents(
        res.data.map((a: any) => ({
          id: a._id || a.id,
          title: a.title,
          start: a.start,
          end: a.end,
          patientId: a.patientId,
          notes: a.notes,
          status: a.status,
        })),
      );
    } catch (error) {
      console.error(error);
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
    if (!practitionerId) return;

    setLoading(true);
    Promise.all([fetchAppointments(), fetchBlockedSlots()]).finally(() =>
      setLoading(false),
    );
  }, [practitionerId, fetchAppointments, fetchBlockedSlots]);

  /* ================= CREATE ================= */

  // Prevent selecting blocked slots
  const selectAllow = (selectInfo: any) => {
    const selStart = selectInfo.start;
    const selEnd = selectInfo.end;

    // Check if selection overlaps any blocked slot
    for (const block of blockedSlots) {
      if (block.blockType === "day") {
        const isoDate = selStart.toISOString().split("T")[0];
        if (isoDate === block.date) {
          Helpers.showNotification("This day is completely blocked", "error");
          return false;
        }
      } else if (block.blockType === "slot") {
        const blockStart = new Date(`${block.date}T${block.startTime}`);
        const blockEnd = new Date(`${block.date}T${block.endTime}`);
        if (selStart < blockEnd && selEnd > blockStart) {
          Helpers.showNotification("This time slot is blocked", "error");
          return false;
        }
      }
    }
    return true;
  };

  const handleSlotSelect = (info: any) => {
    setSelectedDate(info.start);
    setSelectedEvent(null);
    setDialogOpen(true);
  };

  /* ================= EDIT ================= */

  const handleEventClick = (info: any) => {
    if (String(info.event.id).startsWith("block-")) return;

    const start = info.event.start;
    const end = info.event.end ?? new Date(start.getTime() + 30 * 60000);

    setSelectedEvent({
      id: info.event.id,
      title: info.event.title,
      start: start.toISOString(),
      end: end.toISOString(),
      patientId: info.event.extendedProps.patientId,
      notes: info.event.extendedProps.notes,
      status: info.event.extendedProps.status,
    });

    setSelectedDate(start);
    setDialogOpen(true);
  };

  /* ================= SAVE ================= */

  const handleSave = async (payload: any, id?: string) => {
    if (!practitionerId) return;

    try {
      if (id) {
        await api.put(`/appointments/${id}`, {
          ...payload,
          practitionerId,
        });
      } else {
        await api.post(`/appointments`, {
          ...payload,
          practitionerId,
        });
      }

      Helpers.showNotification("Saved successfully", "success");
      await fetchAppointments();
    } catch (err: any) {
      Helpers.showNotification(
        err?.response?.data?.message || "Failed to save",
        "error",
      );
    }
  };

  /* ================= DELETE ================= */

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/appointments/${id}`);
      Helpers.showNotification("Deleted successfully", "success");
      await fetchAppointments();
    } catch (err: any) {
      Helpers.showNotification(
        err?.response?.data?.message || "Delete failed",
        "error",
      );
    }
  };

  /* ================= DRAG / RESIZE FIXED ================= */

  const updateEventByDrag = useCallback(
    async (info: any) => {
      if (!practitionerId) return;

      const event = info.event;

      const start: Date = event.start;
      const end: Date = event.end ?? new Date(start.getTime() + 30 * 60000); // 🔥 FIXED

      // Check if new position overlaps blocked slots
      for (const block of blockedSlots) {
        if (block.blockType === "day") {
          const isoDate = start.toISOString().split("T")[0];
          if (isoDate === block.date) {
            info.revert();
            Helpers.showNotification("Cannot move to blocked day", "error");
            return;
          }
        } else if (block.blockType === "slot") {
          const blockStart = new Date(`${block.date}T${block.startTime}`);
          const blockEnd = new Date(`${block.date}T${block.endTime}`);
          if (start < blockEnd && end > blockStart) {
            info.revert();
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
        await fetchAppointments();
      } catch (err: any) {
        info.revert();

        Helpers.showNotification(
          err?.response?.data?.message || "Reschedule failed",
          "error",
        );
      }
    },
    [practitionerId, blockedSlots, fetchAppointments],
  );

  /* ================= RENDER ================= */

  // Helper function to get color based on status
  const getStatusColor = (status?: string): string => {
    switch (status) {
      case "confirmed":
        return "#22c55e"; // green
      case "completed":
        return "#3b82f6"; // blue
      case "cancelled":
        return "#ef4444"; // red
      case "pending":
      default:
        return "#f59e0b"; // amber/yellow
    }
  };

  if (loading) {
    return <p>Loading calendar…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Appointments</h1>
        <Button
          className="text-primary-light"
          onClick={() => setAvailabilityOpen(true)}
        >
          Manage Availability
        </Button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div
          className="fc-container-wrapper"
          style={{ height: "auto", minHeight: "800px" }}
        >
          <FullCalendar
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            slotMinTime="10:00:00"
            slotMaxTime="18:00:00"
            slotDuration="00:30:00"
            height="auto"
            contentHeight="auto"
            selectable={true}
            longPressDelay={0}
            selectLongPressDelay={0}
            eventLongPressDelay={0}
            selectAllow={selectAllow}
            editable={true}
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
