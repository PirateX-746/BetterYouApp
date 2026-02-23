"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid/index.js";
import dayGridPlugin from "@fullcalendar/daygrid/index.js";
import interactionPlugin from "@fullcalendar/interaction/index.js";
import { Helpers } from "@/utils/helpers";
import AddAppointmentDialog from "./AddAppointmentDialog";
import { Button } from "@/components/ui/button";
import ManageAvailabilityDialog from "./ManageAvailabilityDialog";

/* =====================================================
   TYPES
   ===================================================== */

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  patientId: string;
  notes?: string;
  status?: string;
};

/* =====================================================
   COMPONENT
   ===================================================== */

export default function AppointmentsClient() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [practitionerId, setPractitionerId] = useState<string | null>(null);

  const [availabilityOpen, setAvailabilityOpen] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );

  /* =====================================================
     READ PRACTITIONER ID (SAFE)
     ===================================================== */

  useEffect(() => {
    const id = localStorage.getItem("userId");

    if (!id) {
      Helpers.showNotification("Practitioner not logged in", "error");
      setLoading(false);
      return;
    }

    setPractitionerId(id);
  }, []);

  /* =====================================================
     FETCH APPOINTMENTS (SAFE)
     ===================================================== */

  const fetchAppointments = useCallback(async () => {
    if (!practitionerId) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/appointments/practitioner/${practitionerId}`,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to fetch appointments");
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        setEvents([]);
        return;
      }

      setEvents(
        data.map((a: any) => ({
          id: a._id,
          title: a.title,
          start: a.start,
          end: a.end,
          patientId: a.patientId,
          notes: a.notes,
          status: a.status,
        })),
      );
    } catch (error) {
      console.error("Fetch appointments error:", error);
      Helpers.showNotification(
        "Unable to load appointments. Please check server.",
        "error",
      );
      setEvents([]);
    }
  }, [practitionerId]);

  useEffect(() => {
    if (!practitionerId) return;

    setLoading(true);
    fetchAppointments().finally(() => setLoading(false));
  }, [fetchAppointments, practitionerId]);

  /* =====================================================
     CREATE
     ===================================================== */

  const handleSlotSelect = (info: any) => {
    setSelectedDate(info.start);
    setSelectedEvent(null);
    setDialogOpen(true);
  };

  /* =====================================================
     EDIT
     ===================================================== */

  const handleEventClick = (info: any) => {
    setSelectedEvent({
      id: info.event.id,
      title: info.event.title,
      start: info.event.start.toISOString(),
      end: info.event.end?.toISOString() ?? info.event.start.toISOString(),
      patientId: info.event.extendedProps.patientId,
      notes: info.event.extendedProps.notes,
      status: info.event.extendedProps.status,
    });

    setSelectedDate(info.event.start);
    setDialogOpen(true);
  };

  /* =====================================================
     CREATE / UPDATE (DIALOG)
     ===================================================== */

  const handleSave = async (payload: any, id?: string) => {
    if (!practitionerId) return;

    const url = id
      ? `${process.env.NEXT_PUBLIC_API_URL}/appointments/${id}`
      : `${process.env.NEXT_PUBLIC_API_URL}/appointments`;

    try {
      const res = await fetch(url, {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          practitionerId,
        }),
      });

      if (!res.ok) {
        throw new Error("Save failed");
      }

      Helpers.showNotification(
        id
          ? "Appointment updated successfully"
          : "Appointment scheduled successfully",
        "success",
      );

      await fetchAppointments();
    } catch {
      Helpers.showNotification("Failed to save appointment", "error");
    }
  };

  /* =====================================================
     DELETE
     ===================================================== */

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/appointments/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Delete failed");
      }

      Helpers.showNotification("Appointment deleted successfully", "success");
      await fetchAppointments();
    } catch {
      Helpers.showNotification("Failed to delete appointment", "error");
    }
  };

  /* =====================================================
     DRAG / RESIZE UPDATE (OVERLAP SAFE)
     ===================================================== */

  const updateEventByDrag = async (info: any) => {
    if (!practitionerId) return;

    const event = info.event;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/appointments/${event.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: event.title,
            start: event.start.toISOString(),
            end: event.end
              ? event.end.toISOString()
              : event.start.toISOString(),
            notes: event.extendedProps.notes,
            practitionerId,
          }),
        },
      );

      if (!res.ok) {
        throw new Error("Overlap or invalid update");
      }

      Helpers.showNotification("Appointment rescheduled", "success");
      await fetchAppointments();
    } catch {
      info.revert(); // ⛔ restore original slot
      Helpers.showNotification("This time slot is already booked", "error");
    }
  };

  /* =====================================================
     DEBOUNCED DRAG HANDLER (STABLE)
     ===================================================== */

  const debouncedUpdateEventByDrag = useMemo(
    () => Helpers.debounce(updateEventByDrag, 300),
    [updateEventByDrag],
  );

  /* =====================================================
     RENDER
     ===================================================== */

  if (loading) {
    return <p className="text-sm text-text-secondary">Loading calendar…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Appointments
          </h1>
          <p className="text-text-secondary py-1">
            Available: 10:00 AM - 6:00 PM | Click on calendar to schedule
          </p>
        </div>

        {/* 👇 THIS IS WHERE THE BUTTON GOES */}
        <Button variant="secondary" onClick={() => setAvailabilityOpen(true)}>
          Manage Availability
        </Button>
      </div>

      <div className="bg-[var(--bg-card)] p-6 border border-[var(--border-light)]">
        <FullCalendar
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          slotMinTime="10:00:00"
          slotMaxTime="18:00:00"
          slotDuration="00:30:00"
          height="auto"
          allDaySlot={false}
          nowIndicator
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5, 6],
            startTime: "10:00",
            endTime: "18:00",
          }}
          selectable
          editable
          eventConstraint="businessHours"
          selectConstraint="businessHours"
          select={handleSlotSelect}
          eventClick={handleEventClick}
          events={events}
          eventDrop={debouncedUpdateEventByDrag}
          eventResize={debouncedUpdateEventByDrag}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
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
        onRefresh={fetchAppointments}
      />
    </div>
  );
}
