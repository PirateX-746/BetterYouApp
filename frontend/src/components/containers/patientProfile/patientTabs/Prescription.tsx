"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  X,
  Printer,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface Prescription {
  _id: string;
  diagnosis: string;
  medications: Medication[];
  notes?: string;
  status: "active" | "completed" | "cancelled";
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

const EMPTY_MED: Medication = { name: "", dosage: "", frequency: "", duration: "" };

export default function PrescriptionTab() {
  const params = useParams();
  const patientId = params?.id as string;
  const practitionerId =
    typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [meds, setMeds] = useState<Medication[]>([{ ...EMPTY_MED }]);
  const formRef = useRef<HTMLDivElement>(null);

  const fetchPrescriptions = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await api.get("/prescriptions", { params: { patientId } });
      setPrescriptions(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load prescriptions");
    }
  }, [patientId]);

  useEffect(() => {
    fetchPrescriptions().finally(() => setLoading(false));
  }, [fetchPrescriptions]);

  useEffect(() => {
    if (showForm) {
      setTimeout(
        () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        80,
      );
    }
  }, [showForm]);

  const resetForm = () => {
    setDiagnosis("");
    setNotes("");
    setMeds([{ ...EMPTY_MED }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim()) { toast.error("Diagnosis is required"); return; }
    if (meds.some((m) => !m.name.trim())) { toast.error("Each medication needs a name"); return; }
    setSaving(true);
    try {
      await api.post("/prescriptions", {
        patientId,
        practitionerId,
        diagnosis,
        medications: meds,
        notes: notes || undefined,
      });
      await fetchPrescriptions();
      resetForm();
      setShowForm(false);
      toast.success("Prescription created");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? "Failed to create prescription");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await api.patch(`/prescriptions/${id}`, { status });
      setPrescriptions((prev) =>
        prev.map((p) => (p._id === id ? { ...p, ...res.data } : p)),
      );
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this prescription?")) return;
    try {
      await api.delete(`/prescriptions/${id}`);
      setPrescriptions((prev) => prev.filter((p) => p._id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handlePrint = (rx: Prescription) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Prescription</title><style>
        body{font-family:sans-serif;padding:40px;color:#1f1f1f}
        h1{font-size:20px;margin-bottom:4px}
        .meta{color:#5f6368;font-size:13px;margin-bottom:24px}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th{text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#9aa0a6;padding:6px 0;border-bottom:1px solid #e8eaed}
        td{font-size:14px;padding:8px 0;border-bottom:1px solid #f0f0f0}
        .notes{margin-top:16px;font-size:13px;color:#5f6368}
      </style></head><body>
        <h1>${rx.diagnosis}</h1>
        <div class="meta">
          Date: ${new Date(rx.createdAt).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})} &nbsp;·&nbsp; Status: ${rx.status}
        </div>
        <table>
          <thead><tr><th>Drug</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead>
          <tbody>${rx.medications.map(m=>`<tr><td>${m.name}</td><td>${m.dosage}</td><td>${m.frequency}</td><td>${m.duration}</td></tr>`).join("")}</tbody>
        </table>
        ${rx.notes ? `<div class="notes"><strong>Notes:</strong> ${rx.notes}</div>` : ""}
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const updateMed = (i: number, field: keyof Medication, value: string) => {
    setMeds((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)),
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="animate-spin text-primary" size={22} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {prescriptions.length} prescription{prescriptions.length !== 1 ? "s" : ""}
        </p>
        <Button
          size="sm"
          onClick={() => {
            setShowForm((v) => !v);
            if (showForm) resetForm();
          }}
        >
          {showForm ? <X size={14} className="mr-1.5" /> : <Plus size={14} className="mr-1.5" />}
          {showForm ? "Cancel" : "New Prescription"}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div ref={formRef} className="border border-border rounded-2xl p-4 space-y-4 bg-bg-page">
          <p className="text-sm font-semibold text-text-primary">New Prescription</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Diagnosis</Label>
              <Input
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Generalised Anxiety Disorder"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Medications</Label>
                <button
                  type="button"
                  onClick={() => setMeds((p) => [...p, { ...EMPTY_MED }])}
                  className="text-xs text-primary hover:underline"
                >
                  + Add
                </button>
              </div>
              {meds.map((med, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 border border-border rounded-xl p-3">
                  <Input value={med.name} onChange={(e) => updateMed(i, "name", e.target.value)} placeholder="Drug name" />
                  <Input value={med.dosage} onChange={(e) => updateMed(i, "dosage", e.target.value)} placeholder="Dosage" />
                  <Input value={med.frequency} onChange={(e) => updateMed(i, "frequency", e.target.value)} placeholder="Frequency" />
                  <div className="flex gap-2">
                    <Input value={med.duration} onChange={(e) => updateMed(i, "duration", e.target.value)} placeholder="Duration" />
                    {meds.length > 1 && (
                      <button type="button" onClick={() => setMeds((p) => p.filter((_, idx) => idx !== i))} className="text-danger shrink-0">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Additional instructions…"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-bg-page text-text-primary focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving && <Loader2 size={13} className="animate-spin mr-1.5" />}
                {saving ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Prescription list */}
      {prescriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <FileText size={32} className="text-text-disabled" />
          <p className="text-sm text-text-secondary">No prescriptions yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {prescriptions.map((rx) => (
            <div key={rx._id} className="border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{rx.diagnosis}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {new Date(rx.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}
                    {rx.medications.length} medication{rx.medications.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[rx.status]}`}>
                    {rx.status}
                  </span>
                  <select
                    value={rx.status}
                    onChange={(e) => handleStatusChange(rx._id, e.target.value)}
                    className="text-xs border border-border rounded-lg px-2 py-1 bg-bg-page text-text-secondary focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button onClick={() => setExpanded((v) => (v === rx._id ? null : rx._id))} className="text-text-secondary hover:text-text-primary transition p-1">
                    {expanded === rx._id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                  <button onClick={() => handlePrint(rx)} className="text-text-secondary hover:text-primary transition p-1" title="Print prescription">
                    <Printer size={14} />
                  </button>
                  <button onClick={() => handleDelete(rx._id)} className="text-text-secondary hover:text-danger transition p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {expanded === rx._id && (
                <div className="border-t border-border px-4 py-4 space-y-3 bg-bg-page">
                  <div>
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Medications</p>
                    <div className="space-y-2">
                      {rx.medications.map((m, i) => (
                        <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm py-2 border-b border-border last:border-0">
                          <div><p className="text-[10px] text-text-secondary uppercase tracking-wide">Drug</p><p className="font-medium text-text-primary">{m.name}</p></div>
                          <div><p className="text-[10px] text-text-secondary uppercase tracking-wide">Dosage</p><p className="font-medium text-text-primary">{m.dosage}</p></div>
                          <div><p className="text-[10px] text-text-secondary uppercase tracking-wide">Frequency</p><p className="font-medium text-text-primary">{m.frequency}</p></div>
                          <div><p className="text-[10px] text-text-secondary uppercase tracking-wide">Duration</p><p className="font-medium text-text-primary">{m.duration}</p></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {rx.notes && (
                    <div>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Notes</p>
                      <p className="text-sm text-text-primary">{rx.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
