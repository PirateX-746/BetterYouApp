"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
      const res = await api.get(`/appointments/practitioner/${practitionerId}`);
      const data = res.data;

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

    try {
      const res = id
        ? await api.put(`/appointments/${id}`, { ...payload, practitionerId })
        : await api.post(`/appointments`, { ...payload, practitionerId });

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
      await api.delete(`/appointments/${id}`);

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
      await api.put(`/appointments/${event.id}`, {
        title: event.title,
        start: event.start.toISOString(),
        end: event.end
          ? event.end.toISOString()
          : event.start.toISOString(),
        notes: event.extendedProps.notes,
        practitionerId,
      });

      Helpers.showNotification("Appointment rescheduled", "success");
      await fetchAppointments();
    } catch (err: any) {
      info.revert(); // ⛔ restore original slot
      const msg = err.response?.data?.message || "Operation failed";
      Helpers.showNotification(msg, "error");
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
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Appointments
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Available: 10:00 AM - 6:00 PM | Click on calendar to schedule
          </p>
        </div>

        {/* 👇 THIS IS WHERE THE BUTTON GOES */}
        <Button variant="secondary" onClick={() => setAvailabilityOpen(true)} className="w-full sm:w-auto bg-primary/10 text-primary hover:bg-primary/20 border-0">
          Manage Availability
        </Button>
      </div>

      <div className="bg-bg-card p-4 sm:p-6 lg:p-8 rounded-xl border border-border shadow-sm overflow-hidden">
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
