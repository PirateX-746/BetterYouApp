"use client";

import { useEffect, useState } from "react";
import { CalendarEvent } from "@/types/appointment";
import { api } from "@/lib/api";

type Patient = {
  _id: string;
  firstName: string;
  lastName?: string;
};

type Props = {
  open: boolean;
  initialDate: Date | null;
  event: CalendarEvent | null;
  onClose: () => void;
  onSave: (data: any, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export default function AddAppointmentDialog({
  open,
  initialDate,
  event,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const [title, setTitle] = useState("");
  const [patientId, setPatientId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");

  /* 🧠 Prefill for edit */
  useEffect(() => {
    if (!event) return;

    const start = new Date(event.start);
    const end = new Date(event.end);

    setTitle(event.title);
    setPatientId(event.patientId); // 🔒 locked later
    setNotes(event.notes ?? "");
    setDate(start.toISOString().slice(0, 10));
    setTime(start.toTimeString().slice(0, 5));
    setDuration((end.getTime() - start.getTime()) / 60000);
  }, [event]);

  /* 🕒 Prefill for create */
  useEffect(() => {
    if (!initialDate || event) return;

    setDate(initialDate.toISOString().slice(0, 10));
    setTime(initialDate.toTimeString().slice(0, 5));
  }, [initialDate, event]);

  /* 👥 Fetch patients */
  useEffect(() => {
    if (!open) return;

    const fetchPatients = async () => {
      setLoadingPatients(true);
      const res = await api.get("/patients");
      setPatients(Array.isArray(res.data) ? res.data : []);
      setLoadingPatients(false);
    };

    fetchPatients();
  }, [open]);

  /* 🔄 Reset on close */
  useEffect(() => {
    if (open) return;

    setTitle("");
    setNotes("");
    setPatientId("");
    setDuration(30);
  }, [open]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!date || !time) return;

    const start = new Date(`${date}T${time}`);
    const end = new Date(start.getTime() + duration * 60000);

    await onSave(
      {
        title,
        patientId,
        start: start.toISOString(),
        end: end.toISOString(),
        notes,
      },
      event?.id,
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          {event ? "Edit Appointment" : "Schedule Appointment"}
        </h2>

        <select
          className="w-full border p-2 rounded bg-white
             disabled:bg-gray-100 disabled:cursor-not-allowed"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          disabled={!!event}
        >
          <option value="">Select Patient</option>
          {patients.map((p) => (
            <option key={p._id} value={p._id}>
              {p.firstName} {p.lastName ?? ""}
            </option>
          ))}
        </select>

        <select
          className="w-full border p-2 rounded"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        >
          <option value="">Select Appointment Type</option>
          <option value="New Patient Visit">New Patient Visit</option>
          <option value="Follow-Up Session">Follow-Up Session</option>
          <option value="Counselling Session">Counselling Session</option>
        </select>

        <div className="flex gap-2">
          <input
            type="date"
            className="border p-2 rounded w-full"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <input
            type="time"
            className="border p-2 rounded w-full"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        <select
          className="w-full border p-2 rounded"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        >
          <option value={30}>30 minutes</option>
          <option value={45}>45 minutes</option>
          <option value={60}>1 hour</option>
        </select>

        <textarea
          className="w-full border p-2 rounded"
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex justify-between items-center">
          {event && (
            <button
              onClick={() => {
                onDelete(event.id);
                onClose();
              }}
              className="px-4 py-2 border border-red-300 text-red-600 rounded"
            >
              Delete
            </button>
          )}

          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-2 border rounded">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-primary text-white rounded"
            >
              {event ? "Update" : "Schedule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
